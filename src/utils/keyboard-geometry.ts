import { D } from '@/utils/decimal-math'
import type { Key } from '@/stores/keyboard'

/**
 * Calculate the center point of a key in layout coordinates (units).
 * Handles rotation transformations correctly.
 *
 * @param key - The key object with position, dimensions, and optional rotation
 * @returns Center point {x, y} in layout units
 *
 * @example
 * const key = { x: 0, y: 0, width: 2, height: 1 }
 * const center = getKeyCenter(key) // { x: 1, y: 0.5 }
 */
export function getKeyCenter(key: Key): { x: number; y: number } {
  // Calculate key center in key-local coordinates (in units)
  let centerX = D.add(key.x, D.div(key.width || 1, 2))
  let centerY = D.add(key.y, D.div(key.height || 1, 2))

  // Apply rotation transformation if key is rotated
  if (key.rotation_angle && key.rotation_angle !== 0) {
    const originX = key.rotation_x !== undefined ? key.rotation_x : centerX
    const originY = key.rotation_y !== undefined ? key.rotation_y : centerY
    const angleRad = D.degreesToRadians(key.rotation_angle)
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    // Translate center relative to rotation origin
    const relativeX = D.sub(centerX, originX)
    const relativeY = D.sub(centerY, originY)

    // Apply rotation transformation
    const rotatedX = D.sub(D.mul(relativeX, cos), D.mul(relativeY, sin))
    const rotatedY = D.add(D.mul(relativeX, sin), D.mul(relativeY, cos))

    // Translate back to absolute coordinates
    centerX = D.add(originX, rotatedX)
    centerY = D.add(originY, rotatedY)
  }

  // Return center in layout units
  return {
    x: Number(centerX),
    y: Number(centerY),
  }
}

/**
 * Calculate the center point of a key in millimeters, applying rotation in mm-space.
 *
 * Unlike getKeyCenter (which rotates in layout-unit space), this function
 * converts to mm first and then applies rotation. This is necessary when
 * spacingX ≠ spacingY, because non-uniform scaling after rotation would
 * distort the geometry.
 *
 * @param key - The key object with position, dimensions, and optional rotation
 * @param spacingX - Horizontal spacing in mm per unit
 * @param spacingY - Vertical spacing in mm per unit
 * @returns Center point {x, y} in millimeters
 */
export function getKeyCenterMm(
  key: Key,
  spacingX: number,
  spacingY: number,
): { x: number; y: number } {
  // Pre-rotation center in layout units
  const centerX_u = D.add(key.x, D.div(key.width || 1, 2))
  const centerY_u = D.add(key.y, D.div(key.height || 1, 2))

  // Convert to mm
  let centerX_mm = D.mul(centerX_u, spacingX)
  let centerY_mm = D.mul(centerY_u, spacingY)

  // Apply rotation in mm space if key is rotated
  if (key.rotation_angle && key.rotation_angle !== 0) {
    const originX_u = key.rotation_x !== undefined ? key.rotation_x : centerX_u
    const originY_u = key.rotation_y !== undefined ? key.rotation_y : centerY_u

    const originX_mm = D.mul(originX_u, spacingX)
    const originY_mm = D.mul(originY_u, spacingY)

    const angleRad = D.degreesToRadians(key.rotation_angle)
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    const relX = D.sub(centerX_mm, originX_mm)
    const relY = D.sub(centerY_mm, originY_mm)

    const rotX = D.sub(D.mul(relX, cos), D.mul(relY, sin))
    const rotY = D.add(D.mul(relX, sin), D.mul(relY, cos))

    centerX_mm = D.add(originX_mm, rotX)
    centerY_mm = D.add(originY_mm, rotY)
  }

  return { x: Number(centerX_mm), y: Number(centerY_mm) }
}

/**
 * Calculate the Euclidean distance between the centers of two keys in layout units.
 *
 * @param key1 - First key
 * @param key2 - Second key
 * @returns Distance between key centers in layout units
 *
 * @example
 * const key1 = { x: 0, y: 0, width: 1, height: 1 }
 * const key2 = { x: 1, y: 0, width: 1, height: 1 }
 * const distance = getKeyDistance(key1, key2) // 1.0 units
 */
export function getKeyDistance(key1: Key, key2: Key): number {
  const center1 = getKeyCenter(key1)
  const center2 = getKeyCenter(key2)
  return Math.sqrt(Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2))
}
