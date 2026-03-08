/**
 * Main plate building logic
 *
 * This module orchestrates the generation of switch cutout plates from keyboard layouts.
 * It handles coordinate transformation, cutout positioning, and export to SVG/DXF.
 */

import type MakerJs from 'makerjs'
import type { Key } from '@adamws/kle-serial'
import type {
  CutoutType,
  PlateGenerationResult,
  KeyCutoutPosition,
  StabilizerType,
  OutlineSettings,
  MountingHolesSettings,
  CustomHolesSettings,
} from '@/types/plate'
import { getMakerJs } from '@/utils/makerjs-loader'
import { getKeyCenterMm } from '@/utils/keyboard-geometry'
import { D } from '@/utils/decimal-math'
import {
  positionCutout,
  getCutoutGenerator,
  createStabilizerAlpsModel,
  createStabilizerMxBasicModel,
  createStabilizerMxSpecModel,
} from './cutout-generator'

/**
 * Options for building a plate
 */
export interface PlateBuilderOptions {
  /** Type of cutout to generate */
  cutoutType: CutoutType
  /** Type of stabilizer cutout to generate */
  stabilizerType?: StabilizerType
  /** Fillet (corner rounding) radius in mm for switch cutouts */
  filletRadius?: number
  /** Fillet (corner rounding) radius in mm for stabilizer cutouts */
  stabilizerFilletRadius?: number
  /** Size adjustment in mm. Positive = shrink, negative = expand (default: 0) */
  sizeAdjust?: number
  /** Horizontal spacing between key units in mm (default: 19.05) */
  spacingX?: number
  /** Vertical spacing between key units in mm (default: 19.05) */
  spacingY?: number
  /** Custom cutout width in mm (for custom-rectangle type) */
  customCutoutWidth?: number
  /** Custom cutout height in mm (for custom-rectangle type) */
  customCutoutHeight?: number
  /** Merge overlapping cutouts into simplified paths (default: false) */
  mergeCutouts?: boolean
  /** Outline generation settings */
  outline?: OutlineSettings
  /** Mounting holes settings */
  mountingHoles?: MountingHolesSettings
  /** Custom holes settings */
  customHoles?: CustomHolesSettings
  /** Plate thickness in mm for 3D export (default: 1.5) */
  thickness?: number
}

/**
 * Default spacing values (standard MX spacing)
 */
const DEFAULT_SPACING_X = 19.05
const DEFAULT_SPACING_Y = 19.05

/**
 * Error thrown when plate generation fails
 */
export class PlateBuilderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlateBuilderError'
  }
}

/**
 * Extend the viewBox of an SVG by adding padding on all sides.
 * This prevents strokes at the edges from being clipped.
 *
 * @param svg - The SVG string to modify
 * @param padding - Padding to add on each side (in the same units as viewBox)
 * @returns SVG string with extended viewBox
 */
function extendSvgViewBox(svg: string, padding: number): string {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
  if (!viewBoxMatch || !viewBoxMatch[1]) return svg

  const parts = viewBoxMatch[1].split(/\s+/).map(Number)
  if (parts.length !== 4) return svg

  const [minX, minY, width, height] = parts as [number, number, number, number]

  const newMinX = minX - padding
  const newMinY = minY - padding
  const newWidth = width + padding * 2
  const newHeight = height + padding * 2

  const newViewBox = `${newMinX} ${newMinY} ${newWidth} ${newHeight}`

  return svg.replace(/viewBox="[^"]+"/, `viewBox="${newViewBox}"`)
}

const KEY_SORT = (a: Key, b: Key) => {
  const dy = D.sub(a.y, b.y)
  return dy !== 0 ? dy : D.sub(a.x, b.x)
}

/**
 * Filter keys to only those that should have switch/stab cutouts.
 * Excludes decal keys and ghost keys.
 */
function filterCutoutKeys(keys: Key[]): Key[] {
  return keys.filter((key) => !key.decal && !key.ghost).sort(KEY_SORT)
}

/**
 * Filter keys that should contribute to outline generation.
 * Excludes decal keys only — ghost keys are included so they can
 * be used to adjust the tight outline shape without producing cutouts.
 */
function filterOutlineKeys(keys: Key[]): Key[] {
  return keys.filter((key) => !key.decal).sort(KEY_SORT)
}

/**
 * Convert a KLE key to a cutout position with coordinate transformation.
 *
 * Positions are computed relative to originCenterMm (the first key's center in mm),
 * with the origin key's top-left cutout corner placed at (0, 0).
 *
 * Coordinate transformation:
 * - KLE: +Y down, clockwise rotation
 * - Maker.js: +Y up, counter-clockwise rotation
 */
function keyToCutoutPosition(
  key: Key,
  cutoutType: CutoutType,
  spacingX: number,
  spacingY: number,
  originCenterMm: { x: number; y: number },
  customWidth?: number,
  customHeight?: number,
): KeyCutoutPosition {
  const generator = getCutoutGenerator(cutoutType, customWidth, customHeight)
  const centerMm = getKeyCenterMm(key, spacingX, spacingY)

  return {
    centerX: D.sub(D.sub(centerMm.x, originCenterMm.x), D.div(generator.width, 2)),
    centerY: D.sub(D.sub(originCenterMm.y, centerMm.y), D.div(generator.height, 2)),
    rotationAngle: -(key.rotation_angle || 0),
    width: generator.width,
    height: generator.height,
    footprintWidth: generator.width + ((key.width || 1) - 1) * spacingX,
    footprintHeight: generator.height + ((key.height || 1) - 1) * spacingY,
  }
}

/**
 * Bounding box for cutouts
 */
interface CutoutBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Calculate the bounding box of all cutouts using maker.js modelExtents.
 *
 * @param makerjs - The maker.js module
 * @param plateModel - The plate model containing all cutouts
 * @returns Bounding box coordinates in mm
 */
function calculateCutoutsBounds(makerjs: typeof MakerJs, plateModel: MakerJs.IModel): CutoutBounds {
  const extents = makerjs.measure.modelExtents(plateModel)
  if (!extents) {
    throw new PlateBuilderError('Cannot calculate bounds for empty plate model')
  }
  return {
    minX: extents.low[0]!,
    minY: extents.low[1]!,
    maxX: extents.high[0]!,
    maxY: extents.high[1]!,
  }
}

/**
 * Create an outline rectangle model around the cutouts with specified margins.
 *
 * @param makerjs - The maker.js module
 * @param bounds - Bounding box of the cutouts
 * @param margins - Margins to add on each side (top, bottom, left, right)
 * @param filletRadius - Corner rounding radius in mm (0 = sharp corners)
 * @returns Outline rectangle model
 */
function createOutlineModel(
  makerjs: typeof MakerJs,
  bounds: CutoutBounds,
  margins: { top: number; bottom: number; left: number; right: number },
  filletRadius: number = 0,
): MakerJs.IModel {
  const outlineWidth = bounds.maxX - bounds.minX + margins.left + margins.right
  const outlineHeight = bounds.maxY - bounds.minY + margins.top + margins.bottom

  let outlineModel: MakerJs.IModel

  if (filletRadius > 0) {
    // Use RoundRectangle for filleted corners
    outlineModel = new makerjs.models.RoundRectangle(outlineWidth, outlineHeight, filletRadius)
  } else {
    // Use regular Rectangle for sharp corners
    outlineModel = new makerjs.models.Rectangle(outlineWidth, outlineHeight)
  }

  outlineModel.origin = [bounds.minX - margins.left, bounds.minY - margins.bottom]

  return outlineModel
}

/**
 * Create a tight outline model that closely follows the key cluster shape.
 *
 * For each cutout position, a RoundRectangle padded by `margin` on all sides is created using
 * the same rotation convention as positionCutout. All padded shapes are then unioned
 * iteratively. This avoids the inner/outer ring artefact that expandPaths produces on
 * closed paths (it only creates outer boundaries).
 *
 * Corner radius equals `margin`, so rounded corners appear automatically.
 *
 * @param makerjs - The maker.js module
 * @param cutoutPositions - Array of cutout positions (each has center, size, rotation)
 * @param margin - Expansion distance in mm (also sets corner radius)
 * @returns Tight outline model (may be multiple disconnected loops for split keyboards)
 */
function createTightOutlineModel(
  makerjs: typeof MakerJs,
  cutoutPositions: KeyCutoutPosition[],
  margin: number,
): MakerJs.IModel {
  const paddedModels: Record<string, MakerJs.IModel> = {}
  const keys: string[] = []

  for (let i = 0; i < cutoutPositions.length; i++) {
    const pos = cutoutPositions[i]!
    // Use the key's full footprint (key.width * spacingX, key.height * spacingY) as the base
    // rectangle so that non-1U keys (2U, ISO enter, etc.) are properly covered without needing
    // extra outline rectangles.
    const paddedWidth = pos.footprintWidth + 2 * margin
    const paddedHeight = pos.footprintHeight + 2 * margin

    // Create Rectangle with bottom-left at local [0, 0]
    let padded: MakerJs.IModel = new makerjs.models.Rectangle(paddedWidth, paddedHeight)

    // Center at world origin so rotation happens around the footprint center
    padded = makerjs.model.move(padded, [-paddedWidth / 2, -paddedHeight / 2])

    // Rotate around world [0,0] (= the key center) — same convention as positionCutout
    if (pos.rotationAngle !== 0) {
      padded = makerjs.model.rotate(padded, pos.rotationAngle, [0, 0])
    }

    // Place at key center.
    // pos.centerX is the bottom-left of the cutout, so pos.centerX + pos.width/2 = key center.
    // makerjs.model.move SETS the origin (not additive).
    const keyCenterX = pos.centerX + pos.width / 2
    const keyCenterY = pos.centerY + pos.height / 2
    padded = makerjs.model.move(padded, [
      keyCenterX - paddedWidth / 2,
      keyCenterY - paddedHeight / 2,
    ])

    const k = `padded_${i}`
    paddedModels[k] = padded
    keys.push(k)
  }

  // Iteratively union all padded models.
  // Non-overlapping shapes (e.g. split keyboard halves) are kept as separate loops.
  let result: MakerJs.IModel = {
    models: { [keys[0]!]: makerjs.model.clone(paddedModels[keys[0]!]!) },
  }
  for (let i = 1; i < keys.length; i++) {
    const next: MakerJs.IModel = {
      models: { [keys[i]!]: makerjs.model.clone(paddedModels[keys[i]!]!) },
    }
    makerjs.model.combineUnion(result, next)
    result = {
      models: { ...result.models, ...next.models },
      paths: { ...result.paths, ...next.paths },
    }
  }

  return result
}

/**
 * Create corner mounting holes based on outline bounds.
 *
 * @param makerjs - The maker.js module
 * @param bounds - Bounding box of the cutouts
 * @param margins - Outline margins (to calculate outline corners)
 * @param mountingHoles - Mounting hole settings
 * @returns Record of mounting hole models
 */
function createCornerMountingHoles(
  makerjs: typeof MakerJs,
  bounds: CutoutBounds,
  margins: { top: number; bottom: number; left: number; right: number },
  mountingHoles: MountingHolesSettings,
): Record<string, MakerJs.IModel> {
  const holeRadius = mountingHoles.diameter / 2
  const edgeDist = mountingHoles.edgeDistance

  // Calculate outline dimensions
  const outlineLeft = bounds.minX - margins.left
  const outlineBottom = bounds.minY - margins.bottom
  const outlineRight = bounds.maxX + margins.right
  const outlineTop = bounds.maxY + margins.top

  // Calculate hole positions (absolute coordinates)
  const left = outlineLeft + edgeDist
  const right = outlineRight - edgeDist
  const bottom = outlineBottom + edgeDist
  const top = outlineTop - edgeDist

  const holes: Record<string, MakerJs.IModel> = {}

  holes.holeBottomLeft = new makerjs.models.Ellipse(holeRadius, holeRadius)
  holes.holeBottomLeft.origin = [left, bottom]

  holes.holeBottomRight = new makerjs.models.Ellipse(holeRadius, holeRadius)
  holes.holeBottomRight.origin = [right, bottom]

  holes.holeTopLeft = new makerjs.models.Ellipse(holeRadius, holeRadius)
  holes.holeTopLeft.origin = [left, top]

  holes.holeTopRight = new makerjs.models.Ellipse(holeRadius, holeRadius)
  holes.holeTopRight.origin = [right, top]

  return holes
}

/**
 * Create custom holes at specified positions.
 *
 * @param makerjs - The maker.js module
 * @param customHoles - Custom holes settings
 * @param spacingX - Horizontal spacing between key units in mm
 * @param spacingY - Vertical spacing between key units in mm
 * @returns Record of custom hole models
 */
function createCustomHoles(
  makerjs: typeof MakerJs,
  customHoles: CustomHolesSettings,
  spacingX: number,
  spacingY: number,
): Record<string, MakerJs.IModel> {
  const holes: Record<string, MakerJs.IModel> = {}

  for (const hole of customHoles.holes) {
    const holeRadius = hole.diameter / 2
    // Convert from keyboard units (U) to mm
    const x = hole.offsetX * spacingX
    // Y axis is inverted in maker.js (positive Y is up)
    const y = -hole.offsetY * spacingY

    const holeModel = new makerjs.models.Ellipse(holeRadius, holeRadius)
    holeModel.origin = [x, y]
    holes[`customHole_${hole.id}`] = holeModel
  }

  return holes
}

/**
 * Merge overlapping cutouts into simplified paths using maker.js combineUnion.
 * This reduces complexity when stabilizer cutouts overlap with switch cutouts.
 *
 * @param makerjs - The maker.js module
 * @param cutoutModels - Record of individual cutout models
 * @returns Record with merged models
 */
function mergeOverlappingCutouts(
  makerjs: typeof MakerJs,
  cutoutModels: Record<string, MakerJs.IModel>,
): Record<string, MakerJs.IModel> {
  const modelNames = Object.keys(cutoutModels)
  if (modelNames.length === 0) {
    return {}
  }

  // Start with the first model as the base for merging
  let mergedModel: MakerJs.IModel = {
    models: { [modelNames[0]!]: makerjs.model.clone(cutoutModels[modelNames[0]!]!) },
  }

  // Iteratively combine each subsequent model using union
  for (let i = 1; i < modelNames.length; i++) {
    const nextModel: MakerJs.IModel = {
      models: { [modelNames[i]!]: makerjs.model.clone(cutoutModels[modelNames[i]!]!) },
    }

    // combineUnion merges two models, keeping the union of both areas
    // This handles overlapping shapes by creating a single merged outline
    makerjs.model.combineUnion(mergedModel, nextModel)

    // After combineUnion, nextModel contains the union result
    // We need to collect both models' remaining paths
    mergedModel = {
      models: {
        ...mergedModel.models,
        ...nextModel.models,
      },
      paths: {
        ...mergedModel.paths,
        ...nextModel.paths,
      },
    }
  }

  return { merged: mergedModel }
}

/**
 * Build a plate from a keyboard layout.
 *
 * @param keys - Array of keys from the keyboard layout
 * @param options - Build options including cutout type and spacing
 * @returns PlateGenerationResult with SVG and DXF
 * @throws PlateBuilderError if generation fails
 */
export async function buildPlate(
  keys: Key[],
  options: PlateBuilderOptions,
): Promise<PlateGenerationResult> {
  const {
    cutoutType,
    stabilizerType = 'none',
    filletRadius = 0,
    stabilizerFilletRadius = 0,
    sizeAdjust = 0,
    spacingX = DEFAULT_SPACING_X,
    spacingY = DEFAULT_SPACING_Y,
    customCutoutWidth,
    customCutoutHeight,
    mergeCutouts = false,
    outline,
    mountingHoles,
    customHoles,
    thickness = 1.5,
  } = options

  // Load maker.js
  const makerjs = await getMakerJs()

  // Keys that get switch/stab cutouts (no decals, no ghosts)
  const cutoutKeys = filterCutoutKeys(keys)

  // Check for empty layout
  if (cutoutKeys.length === 0) {
    throw new PlateBuilderError(
      'No valid keys found. All keys are either decal or ghost keys, or the layout is empty.',
    )
  }

  // Use the first non-ghost key's center as the coordinate origin
  const originCenterMm = getKeyCenterMm(cutoutKeys[0]!, spacingX, spacingY)

  // Convert cutout keys to positions (used for switch/stab geometry)
  const cutoutPositions = cutoutKeys.map((key) =>
    keyToCutoutPosition(
      key,
      cutoutType,
      spacingX,
      spacingY,
      originCenterMm,
      customCutoutWidth,
      customCutoutHeight,
    ),
  )

  // Keys that contribute to outline (includes ghost keys)
  const outlineKeys = filterOutlineKeys(keys)
  const outlinePositions = outlineKeys.map((key) =>
    keyToCutoutPosition(
      key,
      cutoutType,
      spacingX,
      spacingY,
      originCenterMm,
      customCutoutWidth,
      customCutoutHeight,
    ),
  )

  // Create cutout models
  const cutoutModels: Record<string, MakerJs.IModel> = {}
  for (let i = 0; i < cutoutPositions.length; i++) {
    const position = cutoutPositions[i]
    const key = cutoutKeys[i]
    if (position) {
      const cutoutModel = await positionCutout(
        position,
        cutoutType,
        filletRadius,
        sizeAdjust,
        customCutoutWidth,
        customCutoutHeight,
        key?.switchRotation || 0,
      )
      cutoutModels[`cutout_${i}`] = cutoutModel

      // Create stabilizer cutout if enabled
      if (stabilizerType !== 'none' && key) {
        const keyWidth = key.width || 1
        const keyHeight = key.height || 1
        let stabModel: MakerJs.IModel | null
        if (stabilizerType === 'mx-spec' || stabilizerType === 'mx-spec-narrow') {
          stabModel = createStabilizerMxSpecModel(
            makerjs,
            keyWidth,
            keyHeight,
            stabilizerFilletRadius,
            sizeAdjust,
            stabilizerType === 'mx-spec-narrow',
          )
        } else if (
          stabilizerType === 'mx-basic' ||
          stabilizerType === 'mx-bidirectional' ||
          stabilizerType === 'mx-tight'
        ) {
          stabModel = createStabilizerMxBasicModel(
            makerjs,
            stabilizerType,
            keyWidth,
            keyHeight,
            stabilizerFilletRadius,
            sizeAdjust,
          )
        } else {
          stabModel = createStabilizerAlpsModel(
            makerjs,
            stabilizerType,
            keyWidth,
            keyHeight,
            stabilizerFilletRadius,
            sizeAdjust,
          )
        }
        if (stabModel) {
          // The stabilizer assembly is centered at its local origin (0,0).
          // position.centerX/Y is where makerjs.model.move places the switch
          // cutout's bottom-left corner (Rectangle referenced from bottom-left).
          // The key's true center is offset by +width/2, +height/2 from that.
          const keyCenterX = D.add(position.centerX, D.div(position.width, 2))
          const keyCenterY = D.add(position.centerY, D.div(position.height, 2))

          let positionedStab = stabModel
          // Combine layout rotation with per-key stabilizer rotation.
          // stabRotation uses KLE convention (clockwise positive), negate for maker.js (CCW positive).
          const totalStabRotation = position.rotationAngle - (key.stabRotation || 0)
          if (totalStabRotation !== 0) {
            positionedStab = makerjs.model.rotate(positionedStab, totalStabRotation, [0, 0])
          }
          positionedStab = makerjs.model.move(positionedStab, [keyCenterX, keyCenterY])
          cutoutModels[`stabilizer_${i}`] = positionedStab
        }
      }
    }
  }

  // Merge overlapping cutouts if enabled
  let finalCutoutModels: Record<string, MakerJs.IModel> = cutoutModels
  if (mergeCutouts) {
    finalCutoutModels = mergeOverlappingCutouts(makerjs, cutoutModels)
  }

  // Create the main plate model with all cutouts
  const plateModel: MakerJs.IModel = {
    models: finalCutoutModels,
    units: makerjs.unitType.Millimeter,
  }

  // Calculate bounds for outline and mounting holes
  const bounds = calculateCutoutsBounds(makerjs, plateModel)
  const outlineMargins = outline
    ? {
        top: outline.marginTop,
        bottom: outline.marginBottom,
        left: outline.marginLeft,
        right: outline.marginRight,
      }
    : { top: 0, bottom: 0, left: 0, right: 0 }

  // Add corner mounting holes to cutouts (rectangular outline only — tight has no fixed corners)
  if (mountingHoles?.enabled && outline?.outlineType === 'rectangular') {
    const holeModels = createCornerMountingHoles(makerjs, bounds, outlineMargins, mountingHoles)
    Object.assign(plateModel.models!, holeModels)
  }

  // Add custom holes
  if (customHoles?.enabled && customHoles.holes.length > 0) {
    const customHoleModels = createCustomHoles(makerjs, customHoles, spacingX, spacingY)
    Object.assign(plateModel.models!, customHoleModels)
  }

  // Create outline model if enabled
  let outlineModel: MakerJs.IModel | null = null
  if (outline?.outlineType === 'tight') {
    outlineModel = createTightOutlineModel(makerjs, outlinePositions, outline.tightMargin)
    // Apply fillet AFTER the union is fully built — not during per-key rect creation.
    // chain.fillet clips the existing paths in-place and returns new arc paths to merge in.
    if (outline.filletRadius > 0) {
      const chains = makerjs.model.findChains(outlineModel) as MakerJs.IChain[]
      if (chains) {
        const allFilletPaths: Record<string, MakerJs.IPath> = {}
        chains.forEach((chain, chainIndex) => {
          const filletModel = makerjs.chain.fillet(chain, outline.filletRadius)
          if (filletModel?.paths) {
            for (const key in filletModel.paths) {
              allFilletPaths[`c${chainIndex}_${key}`] = filletModel.paths[key]!
            }
          }
        })
        outlineModel.paths = { ...outlineModel.paths, ...allFilletPaths }
      }
    }
  } else if (outline?.outlineType === 'rectangular') {
    outlineModel = createOutlineModel(makerjs, bounds, outlineMargins, outline.filletRadius)
  }

  // Build 3D model BEFORE layer-tagging so paths are clean for JSCAD chain containment
  let model3D: MakerJs.IModel | null = null
  if (outlineModel) {
    // Clone and strip layers from outline to avoid chain containment issues
    const outlineClean = makerjs.model.clone(outlineModel)
    makerjs.model.walkPaths(outlineClean, (_mp: MakerJs.IModel, _pi: string, p: MakerJs.IPath) => {
      delete p.layer
    })
    model3D = {
      models: {
        outline: outlineClean,
        cutouts: makerjs.model.clone(plateModel),
      },
      units: makerjs.unitType.Millimeter,
    }
  }

  // Add origin cross marker to the preview model (not included in exports)
  const previewModel: MakerJs.IModel = {
    models: {
      plate: plateModel,
      ...(outlineModel && { outline: outlineModel }),
    },
    units: makerjs.unitType.Millimeter,
  }
  const crossSize = 3
  previewModel.paths = {
    originH: new makerjs.paths.Line([-crossSize, 0], [crossSize, 0]),
    originV: new makerjs.paths.Line([0, -crossSize], [0, crossSize]),
  }
  // Tag origin lines with a layer so we can style them differently
  previewModel.paths.originH!.layer = 'origin'
  previewModel.paths.originV!.layer = 'origin'

  // Tag outline paths with a layer for styling (walk nested models for tight outline)
  if (outlineModel) {
    makerjs.model.walkPaths(outlineModel, (_mp: MakerJs.IModel, _pi: string, p: MakerJs.IPath) => {
      p.layer = 'outline'
    })
  }

  // Generate SVG for preview
  const svgPreviewRaw = makerjs.exporter.toSVG(previewModel, {
    units: makerjs.unitType.Millimeter,
    stroke: 'currentColor',
    strokeWidth: '0.5mm',
    fill: 'none',
    useSvgPathOnly: true,
    svgAttrs: { width: '100%', height: '100%' },
    layerOptions: {
      origin: { stroke: 'red', strokeWidth: '0.3mm' },
      outline: { stroke: '#0066cc', strokeWidth: '0.5mm' },
    },
  })

  // Extend viewBox with padding to prevent edge strokes from being clipped
  const svgPreview = extendSvgViewBox(svgPreviewRaw, 1)

  // Generate SVG for download - uses actual mm units for CAD software
  const svgDownload = makerjs.exporter.toSVG(plateModel, {
    units: makerjs.unitType.Millimeter,
    stroke: '#000',
    strokeWidth: '0.25mm',
    fill: 'none',
    useSvgPathOnly: true,
  })

  // Generate DXF
  const dxfContent = makerjs.exporter.toDXF(plateModel, {
    units: makerjs.unitType.Millimeter,
    usePOLYLINE: true,
  })

  // Generate outline exports if enabled
  let outlineSvgPreview: string | undefined
  let outlineSvgDownload: string | undefined
  let outlineDxfContent: string | undefined
  let mergedSvgDownload: string | undefined
  let mergedDxfContent: string | undefined

  if (outlineModel) {
    const outlineOnlyModel: MakerJs.IModel = {
      models: { outline: outlineModel },
      units: makerjs.unitType.Millimeter,
    }

    // Generate merged exports if merge option is enabled
    if (outline?.mergeWithCutouts) {
      const mergedModel: MakerJs.IModel = {
        models: {
          plate: plateModel,
          outline: outlineModel,
        },
        units: makerjs.unitType.Millimeter,
      }

      mergedSvgDownload = makerjs.exporter.toSVG(mergedModel, {
        units: makerjs.unitType.Millimeter,
        stroke: '#000',
        strokeWidth: '0.25mm',
        fill: 'none',
        useSvgPathOnly: true,
      })

      mergedDxfContent = makerjs.exporter.toDXF(mergedModel, {
        units: makerjs.unitType.Millimeter,
        usePOLYLINE: true,
      })
    } else {
      // Generate separate outline exports
      outlineSvgDownload = makerjs.exporter.toSVG(outlineOnlyModel, {
        units: makerjs.unitType.Millimeter,
        stroke: '#000',
        strokeWidth: '0.25mm',
        fill: 'none',
        useSvgPathOnly: true,
      })

      outlineDxfContent = makerjs.exporter.toDXF(outlineOnlyModel, {
        units: makerjs.unitType.Millimeter,
        usePOLYLINE: true,
      })
    }
  }

  // Generate JSCAD script and STL when outline is enabled
  let jscadScript: string | undefined
  let stlData: string | undefined

  if (model3D) {
    jscadScript = makerjs.exporter.toJscadScript(model3D, {
      extrude: thickness,
      units: makerjs.unitType.Millimeter,
    })

    try {
      const { CAG } = await import('@jscad/csg')
      const stlSerializer = await import('@jscad/stl-serializer')
      stlData = makerjs.exporter.toJscadSTL(CAG, stlSerializer, model3D, {
        extrude: thickness,
        units: makerjs.unitType.Millimeter,
      }) as string
    } catch (err) {
      console.warn('STL generation failed:', err)
    }
  }

  return {
    svgPreview,
    svgDownload,
    dxfContent,
    outlineSvgPreview,
    outlineSvgDownload,
    outlineDxfContent,
    mergedSvgDownload,
    mergedDxfContent,
    jscadScript,
    stlData,
  }
}
