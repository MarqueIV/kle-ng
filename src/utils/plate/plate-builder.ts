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
} from '@/types/plate'
import { getMakerJs } from '@/utils/makerjs-loader'
import { getKeyCenter } from '@/utils/keyboard-geometry'
import { D } from '@/utils/decimal-math'
import {
  positionCutout,
  getCutoutGenerator,
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

/**
 * Filter keys to only include those that should have cutouts.
 * Excludes:
 * - Decal keys (decoration only)
 * - Ghost keys (visual placeholders)
 */
function filterValidKeys(keys: Key[]): Key[] {
  return keys
    .filter((key) => !key.decal && !key.ghost)
    .sort((a, b) => {
      const dy = D.sub(a.y, b.y)
      return dy !== 0 ? dy : D.sub(a.x, b.x)
    })
}

/**
 * Convert a KLE key to a cutout position with coordinate transformation.
 *
 * Positions are computed relative to originCenter (the first key's center),
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
  originCenter: { x: number; y: number },
): KeyCutoutPosition {
  const generator = getCutoutGenerator(cutoutType)
  const center = getKeyCenter(key)

  return {
    centerX: D.sub(D.mul(D.sub(center.x, originCenter.x), spacingX), D.div(generator.width, 2)),
    centerY: D.sub(D.mul(D.sub(originCenter.y, center.y), spacingY), D.div(generator.height, 2)),
    rotationAngle: -(key.rotation_angle || 0),
    width: generator.width,
    height: generator.height,
  }
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
  } = options

  // Load maker.js
  const makerjs = await getMakerJs()

  // Filter out decal and ghost keys
  const validKeys = filterValidKeys(keys)

  // Check for empty layout
  if (validKeys.length === 0) {
    throw new PlateBuilderError(
      'No valid keys found. All keys are either decal or ghost keys, or the layout is empty.',
    )
  }

  // Use the first key's center as the origin so its cutout center lands at (0, 0)
  const originCenter = getKeyCenter(validKeys[0]!)

  // Convert keys to cutout positions
  const cutoutPositions = validKeys.map((key) =>
    keyToCutoutPosition(key, cutoutType, spacingX, spacingY, originCenter),
  )

  // Create cutout models
  const cutoutModels: Record<string, MakerJs.IModel> = {}
  for (let i = 0; i < cutoutPositions.length; i++) {
    const position = cutoutPositions[i]
    const key = validKeys[i]
    if (position) {
      const cutoutModel = await positionCutout(position, cutoutType, filletRadius, sizeAdjust)
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
        } else {
          stabModel = createStabilizerMxBasicModel(
            makerjs,
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
          if (position.rotationAngle !== 0) {
            positionedStab = makerjs.model.rotate(positionedStab, position.rotationAngle, [0, 0])
          }
          positionedStab = makerjs.model.move(positionedStab, [keyCenterX, keyCenterY])
          cutoutModels[`stabilizer_${i}`] = positionedStab
        }
      }
    }
  }

  // Create the main plate model with all cutouts
  const plateModel: MakerJs.IModel = {
    models: cutoutModels,
    units: makerjs.unitType.Millimeter,
  }

  // Add origin cross marker to the preview model (not included in exports)
  const previewModel: MakerJs.IModel = {
    models: { plate: plateModel },
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

  return {
    svgPreview,
    svgDownload,
    dxfContent,
  }
}
