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
  /** Create the cutout model centered at origin */
  createModel(makerjs: typeof MakerJs): MakerJs.IModel
}

/**
 * Cherry MX Basic cutout (14mm x 14mm square)
 * Standard cutout for Cherry MX switches
 */
export class CherryMxBasicCutout implements CutoutGenerator {
  readonly width = 14
  readonly height = 14

  createModel(makerjs: typeof MakerJs): MakerJs.IModel {
    // Create a rectangle centered at origin
    return new makerjs.models.Rectangle(this.width, this.height)
  }
}

/**
 * Registry of cutout generators by type
 */
export const cutoutGenerators: Record<CutoutType, CutoutGenerator> = {
  'cherry-mx-basic': new CherryMxBasicCutout(),
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
  ]
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
): Promise<MakerJs.IModel> {
  const makerjs = await getMakerJs()
  const generator = getCutoutGenerator(cutoutType)

  // Create the base cutout model (centered at origin of the rectangle's corner)
  let model = generator.createModel(makerjs)

  // Center the model at the origin (rectangle is created from 0,0 corner)
  // We need to offset by half width and height to center it
  model = makerjs.model.move(model, [-generator.width / 2, -generator.height / 2])

  // Apply rotation around the origin (which is now the center of the cutout)
  if (cutout.rotationAngle !== 0) {
    model = makerjs.model.rotate(model, cutout.rotationAngle, [0, 0])
  }

  // Move to final position
  model = makerjs.model.move(model, [cutout.centerX, cutout.centerY])

  return model
}
