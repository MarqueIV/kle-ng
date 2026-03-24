/**
 * JSCAD hole cutout generators (mounting holes, custom holes).
 * No maker.js dependency.
 */
import * as jscadModeling from '@jscad/modeling'
import { fmt, fmtVec2, type Geom2 } from './geom-utils'

const { circle } = jscadModeling.primitives

/**
 * Create a circular hole geometry centered at the origin.
 *
 * @param radius - Hole radius in mm
 * @param segments - Arc segment count (default 64, JSCAD native arcs — no tessellation needed)
 */
export function createCircleHoleGeom(radius: number, segments: number = 64): Geom2 {
  return circle({ radius, segments }) as Geom2
}

/**
 * Build JSCAD script lines for a circle hole.
 * Emits a `circle(...)` primitive — no polygon approximation.
 *
 * @param varName - Variable name for the hole (e.g. 'holeBottomLeft')
 * @param radius - Hole radius in mm
 * @param centerX - Final X position in mm
 * @param centerY - Final Y position in mm
 * @param comment - Optional inline comment
 * @param segments - Arc segment count
 */
export function buildCircleHoleScript(
  varName: string,
  radius: number,
  centerX: number,
  centerY: number,
  comment?: string,
  segments: number = 64,
): string[] {
  const segStr = segments !== 64 ? `, segments: ${segments}` : ''
  const inner = `circle({ radius: ${fmt(radius)}${segStr} })`
  const expr =
    centerX !== 0 || centerY !== 0 ? `translate(${fmtVec2(centerX, centerY)}, ${inner})` : inner
  const suffix = comment ? `  // ${comment}` : ''
  return [`const ${varName} = ${expr}${suffix}`]
}
