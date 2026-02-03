/**
 * Cutout shape generators for plate generation
 *
 * This module provides generators for different switch cutout shapes.
 * Each generator creates a maker.js model representing the cutout shape.
 */

import type MakerJs from 'makerjs'
import type { CutoutType, CutoutOption, KeyCutoutPosition } from '@/types/plate'
import { getMakerJs } from '@/utils/makerjs-loader'

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
