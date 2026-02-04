/**
 * Cutout shape generators for plate generation
 *
 * This module provides generators for different switch cutout shapes.
 * Each generator creates a maker.js model representing the cutout shape.
 */

import type MakerJs from 'makerjs'
import type { CutoutType, CutoutOption, KeyCutoutPosition, StabilizerOption } from '@/types/plate'
import { getMakerJs } from '@/utils/makerjs-loader'
import { D } from '@/utils/decimal-math'

/**
 * Interface for cutout generators
 */
export interface CutoutGenerator {
  /** Width of the cutout in mm */
  width: number
  /** Height of the cutout in mm */
  height: number
  /** Maximum allowed fillet radius (min(width, height) / 2) */
  maxFilletRadius: number
  /** Create the cutout model centered at origin */
  createModel(makerjs: typeof MakerJs, filletRadius: number, sizeAdjust?: number): MakerJs.IModel
}

abstract class RectangleCutout implements CutoutGenerator {
  abstract readonly width: number
  abstract readonly height: number

  get maxFilletRadius(): number {
    return Math.min(this.width, this.height) / 2
  }

  createModel(
    makerjs: typeof MakerJs,
    filletRadius: number,
    sizeAdjust: number = 0,
  ): MakerJs.IModel {
    const w = this.width - sizeAdjust * 2
    const h = this.height - sizeAdjust * 2
    if (filletRadius > 0) {
      return new makerjs.models.RoundRectangle(w, h, filletRadius)
    }
    return new makerjs.models.Rectangle(w, h)
  }
}

export class CherryMxBasicCutout extends RectangleCutout {
  readonly width = 14
  readonly height = 14
}

export class AlpsSKCMCutout extends RectangleCutout {
  readonly width = 15.5
  readonly height = 12.8
}

export class AlpsSKCPCutout extends RectangleCutout {
  readonly width = 16
  readonly height = 16
}

export class KailhChocCPG1350 extends RectangleCutout {
  /**
   * Commentary from ai03 plate generator:
   *
   * 'Kailh MX datasheet specifies 13.95+-0.05mm for the part that clips into the plate
   * On the Choc datasheet, the equivalent dimen is marked 13.8mm with a tolerance of 0.2mm
   * Therefore, upper bound is 14mm and cutout size should be 14 x 14'
   */
  readonly width = 14
  readonly height = 14
}

export class KailhChocCPG1232 extends RectangleCutout {
  /**
   * Commentary from ai03 plate generator:
   *
   * 'Switch size according to datasheet = 13.5 +- 0.2 x 12.5 +- 0.2
   * Derived cutout size: 13.7 x 12.7'
   */
  readonly width = 13.7
  readonly height = 12.7
}

/**
 * Registry of cutout generators by type
 */
export const cutoutGenerators: Record<CutoutType, CutoutGenerator> = {
  'cherry-mx-basic': new CherryMxBasicCutout(),
  'alps-skcm': new AlpsSKCMCutout(),
  'alps-skcp': new AlpsSKCPCutout(),
  'kailh-choc-cpg1350': new KailhChocCPG1350(),
  'kailh-choc-cpg1232': new KailhChocCPG1232(),
}

/**
 * Get cutout options for dropdown menus
 */
export function getCutoutOptions(): CutoutOption[] {
  return [
    {
      value: 'cherry-mx-basic',
      label: 'Cherry MX Basic (14mm x 14mm)',
      description: 'Standard square cutout for Cherry MX switches',
    },
    {
      value: 'alps-skcm',
      label: 'Alps SKCM/L (15.5mm x 12.8mm)',
      description: '...',
    },
    {
      value: 'alps-skcp',
      label: 'Alps SKCP (16mm x 16mm)',
      description: '...',
    },
    {
      value: 'kailh-choc-cpg1350',
      label: 'Kailh Choc CPG1350 (14mm x 14mm)',
      description: '...',
    },
    {
      value: 'kailh-choc-cpg1232',
      label: 'Kailh Choc CPG1232 (13.7mm x 12.7mm)',
      description: '...',
    },
  ]
}

/**
 * Validate a fillet radius value for a given cutout type.
 * Returns an error message if invalid, or null if valid.
 */
export function validateFilletRadius(cutoutType: CutoutType, radius: number): string | null {
  if (radius < 0) {
    return 'Fillet radius cannot be negative.'
  }
  const generator = cutoutGenerators[cutoutType]
  if (generator && radius > generator.maxFilletRadius) {
    return `Fillet radius cannot exceed ${generator.maxFilletRadius}mm (half of the smallest cutout dimension).`
  }
  return null
}

/**
 * Validate a size adjustment value for a given cutout type.
 * Positive values (shrink) must not exceed half of the smallest cutout dimension.
 * Negative values (expand) are always valid.
 * Returns an error message if invalid, or null if valid.
 */
export function validateSizeAdjust(cutoutType: CutoutType, sizeAdjust: number): string | null {
  if (sizeAdjust <= 0) {
    return null
  }
  const generator = cutoutGenerators[cutoutType]
  if (generator) {
    const maxShrink = Math.min(generator.width, generator.height) / 2
    if (sizeAdjust >= maxShrink) {
      return `Size adjustment must be less than ${maxShrink}mm (half of the smallest cutout dimension).`
    }
  }
  return null
}

/**
 * Get a cutout generator by type
 */
export function getCutoutGenerator(type: CutoutType): CutoutGenerator {
  const generator = cutoutGenerators[type]
  if (!generator) {
    throw new Error(`Unknown cutout type: ${type}`)
  }
  return generator
}

/**
 * Get the stabilizer spacing (in mm) for a given key size in units.
 * Returns null if key size < 2 (no stabilizer needed).
 */
export function getStabilizerSpacing(keySize: number): number | null {
  if (keySize >= 8) return 66.675
  if (keySize >= 7) return 57.15
  if (keySize >= 6.25) return 50
  if (keySize >= 6) return 47.625
  if (keySize >= 3) return 19.05
  if (keySize >= 2) return 11.938
  return null
}

/**
 * Get stabilizer type options for dropdown menus
 */
export function getStabilizerOptions(): StabilizerOption[] {
  return [
    {
      value: 'mx-basic',
      label: 'Cherry MX Basic (7mm x 15mm)',
      description: 'Standard Cherry MX stabilizer cutouts for keys >= 2U',
    },
    {
      value: 'none',
      label: 'None',
      description: 'No stabilizer cutouts',
    },
  ]
}

/**
 * Create a stabilizer cutout model for a key.
 *
 * Each stabilizer consists of two 7mm x 15mm rectangular cutouts positioned
 * symmetrically at ±spacing from the key center. The cutouts are vertically
 * offset with y range from -9mm to +6mm (center at y = -1.5mm).
 *
 * For vertical keys (height > width), the assembly is rotated -90 degrees.
 *
 * @param makerjs - The maker.js library
 * @param keyWidth - Key width in keyboard units
 * @param keyHeight - Key height in keyboard units
 * @param filletRadius - Fillet radius in mm
 * @param sizeAdjust - Size adjustment in mm (positive = shrink)
 * @returns A maker.js model with two stabilizer cutouts, or null if key < 2U
 */
export function createStabilizerModel(
  makerjs: typeof MakerJs,
  keyWidth: number,
  keyHeight: number,
  filletRadius: number,
  sizeAdjust: number,
): MakerJs.IModel | null {
  // Determine effective key size (use larger dimension for vertical keys)
  let keySize = keyWidth
  const isVertical = keyHeight > keyWidth
  if (isVertical) {
    keySize = keyHeight
  }

  const spacing = getStabilizerSpacing(keySize)
  if (spacing === null) return null

  const stabWidth = 7
  const stabHeight = 15

  // Clamp fillet radius to max for stabilizer dimensions
  const maxFillet = D.div(D.min(stabWidth, stabHeight), 2)
  const clampedFillet = D.min(filletRadius, maxFillet)

  // Adjusted dimensions after size adjustment
  const w = D.sub(stabWidth, D.mul(sizeAdjust, 2))
  const h = D.sub(stabHeight, D.mul(sizeAdjust, 2))

  // Create a single stabilizer cutout rectangle positioned at the given x offset.
  // Uses a single move() call because makerjs.model.move SETS the origin (not additive).
  function createSingleCutout(xOffset: number): MakerJs.IModel {
    let cutout: MakerJs.IModel
    if (clampedFillet > 0) {
      cutout = new makerjs.models.RoundRectangle(w, h, clampedFillet)
    } else {
      cutout = new makerjs.models.Rectangle(w, h)
    }
    // Rectangle bottom-left at (0,0). Single move to:
    // x: center horizontally on xOffset → -w/2 + xOffset
    // y: bottom at -9 + sizeAdjust (top at +6 - sizeAdjust)
    const moveX = D.add(D.div(w, -2), xOffset)
    const moveY = D.add(-9, sizeAdjust)
    cutout = makerjs.model.move(cutout, [moveX, moveY])
    return cutout
  }

  const leftCutout = createSingleCutout(-spacing)
  const rightCutout = createSingleCutout(spacing)

  let stabModel: MakerJs.IModel = {
    models: {
      left: leftCutout,
      right: rightCutout,
    },
  }

  // Rotate -90 degrees for vertical keys
  if (isVertical) {
    stabModel = makerjs.model.rotate(stabModel, -90)
  }

  return stabModel
}

/**
 * Position and rotate a cutout model at the specified location.
 *
 * Important coordinate transformations:
 * - KLE uses +Y down, maker.js uses +Y up
 * - The Y-axis is already inverted in KeyCutoutPosition.centerY
 * - Rotation is already negated in KeyCutoutPosition.rotationAngle
 *
 * Rotation pivot point: The cutout rotates around its own center.
 *
 * @param cutout - The cutout position data
 * @param cutoutType - The type of cutout to create
 * @returns A positioned and rotated maker.js model
 */
export async function positionCutout(
  cutout: KeyCutoutPosition,
  cutoutType: CutoutType,
  filletRadius: number = 0,
  sizeAdjust: number = 0,
): Promise<MakerJs.IModel> {
  const makerjs = await getMakerJs()
  const generator = getCutoutGenerator(cutoutType)

  // Create the base cutout model with size adjustment applied
  let model = generator.createModel(makerjs, filletRadius, sizeAdjust)

  // Center the model at the origin (rectangle is created from 0,0 corner)
  // Use adjusted dimensions for centering
  const adjustedWidth = generator.width - sizeAdjust * 2
  const adjustedHeight = generator.height - sizeAdjust * 2
  model = makerjs.model.move(model, [-adjustedWidth / 2, -adjustedHeight / 2])

  // Apply rotation around the origin (which is now the center of the cutout)
  if (cutout.rotationAngle !== 0) {
    model = makerjs.model.rotate(model, cutout.rotationAngle, [0, 0])
  }

  // Move to final position
  model = makerjs.model.move(model, [cutout.centerX, cutout.centerY])

  return model
}
