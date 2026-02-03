/**
 * Main plate building logic
 *
 * This module orchestrates the generation of switch cutout plates from keyboard layouts.
 * It handles coordinate transformation, cutout positioning, and export to SVG/DXF.
 */

import type MakerJs from 'makerjs'
import type { Key } from '@adamws/kle-serial'
import type { CutoutType, PlateGenerationResult, KeyCutoutPosition } from '@/types/plate'
import { getMakerJs } from '@/utils/makerjs-loader'
import { getKeyCenter } from '@/utils/keyboard-geometry'
import { positionCutout, getCutoutGenerator } from './cutout-generator'

/**
 * Options for building a plate
 */
export interface PlateBuilderOptions {
  /** Type of cutout to generate */
  cutoutType: CutoutType
  /** Fillet (corner rounding) radius in mm (default: 0) */
  filletRadius?: number
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
  return keys.filter((key) => !key.decal && !key.ghost)
}

/**
 * Convert a KLE key to a cutout position with coordinate transformation.
 *
 * Coordinate transformation:
 * - KLE: +Y down, origin top-left
 * - Maker.js: +Y up, origin bottom-left
 *
 * Transform: makerY = -layoutY, rotation = -key.rotation_angle
 */
function keyToCutoutPosition(
  key: Key,
  cutoutType: CutoutType,
  spacingX: number,
  spacingY: number,
): KeyCutoutPosition {
  const generator = getCutoutGenerator(cutoutType)
  const center = getKeyCenter(key)

  return {
    // Convert layout units to mm
    centerX: center.x * spacingX,
    // Invert Y-axis for maker.js coordinate system
    centerY: -center.y * spacingY,
    // Negate rotation for maker.js (clockwise vs counter-clockwise)
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
    filletRadius = 0,
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

  // Convert keys to cutout positions
  const cutoutPositions = validKeys.map((key) =>
    keyToCutoutPosition(key, cutoutType, spacingX, spacingY),
  )

  // Create cutout models
  const cutoutModels: Record<string, MakerJs.IModel> = {}
  for (let i = 0; i < cutoutPositions.length; i++) {
    const position = cutoutPositions[i]
    if (position) {
      const cutoutModel = await positionCutout(position, cutoutType, filletRadius)
      cutoutModels[`cutout_${i}`] = cutoutModel
    }
  }

  // Create the main plate model with all cutouts
  const plateModel: MakerJs.IModel = {
    models: cutoutModels,
    units: makerjs.unitType.Millimeter,
  }

  // Generate SVG for preview - preserveAspectRatio ensures uniform scaling (no stroke distortion)
  const svgPreviewRaw = makerjs.exporter.toSVG(plateModel, {
    units: makerjs.unitType.Millimeter,
    stroke: 'currentColor',
    strokeWidth: '0.5mm',
    fill: 'none',
    useSvgPathOnly: true,
    svgAttrs: { width: '100%', height: '100%' },
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
