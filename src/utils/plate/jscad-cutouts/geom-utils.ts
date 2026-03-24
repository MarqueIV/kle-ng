/**
 * JSCAD geometry placement utilities.
 * No maker.js dependency.
 */
import * as jscadModeling from '@jscad/modeling'

const { translate, rotateZ } = jscadModeling.transforms
const { geom2 } = jscadModeling.geometries

export type Geom2 = ReturnType<typeof jscadModeling.primitives.polygon>

/**
 * Place a Geom2 shape at a given center position with optional rotation.
 * Rotation is applied around the origin first, then the center translation.
 *
 * @param geom - Shape centered at [0, 0]
 * @param centerX - Target X position in mm
 * @param centerY - Target Y position in mm
 * @param rotationDeg - Rotation in degrees, counter-clockwise positive (maker.js/JSCAD convention)
 */
export function placeGeom2(
  geom: Geom2,
  centerX: number,
  centerY: number,
  rotationDeg: number,
): Geom2 {
  let result: Geom2 = geom
  if (rotationDeg !== 0) {
    result = rotateZ(rotationDeg * (Math.PI / 180), result) as Geom2
  }
  if (centerX !== 0 || centerY !== 0) {
    result = translate([centerX, centerY, 0], result) as Geom2
  }
  return result
}

/**
 * Extract the outer polygon points from a Geom2 as a flat [x, y][] array.
 * Used as a fallback to serialize complex shapes to JSCAD script.
 * Ensures CCW winding (positive signed area) as required by JSCAD polygon().
 */
export function extractGeom2Points(geom: Geom2): [number, number][] {
  const outlines: number[][][] = geom2.toOutlines(geom)
  if (outlines.length === 0) return []
  const raw = outlines[0]!
  const pts = raw.map(
    (p) => [Math.round(p[0]! * 1000) / 1000, Math.round(p[1]! * 1000) / 1000] as [number, number],
  )
  // Ensure CCW winding
  let area = 0
  for (let i = 0, n = pts.length; i < n; i++) {
    const [x0, y0] = pts[i]!
    const [x1, y1] = pts[(i + 1) % n]!
    area += x0 * y1 - x1 * y0
  }
  return area < 0 ? pts.slice().reverse() : pts
}

/** Format a number for script output — no trailing zeros, 3 decimal max. */
export function fmt(n: number): string {
  return String(Math.round(n * 1000) / 1000)
}

/** Format a [x, y] pair for script output. */
export function fmtVec2(x: number, y: number): string {
  return `[${fmt(x)}, ${fmt(y)}, 0]`
}

/**
 * Serialize a polygon point array as a compact inline/wrapped string.
 * Points with more than 8 entries are wrapped at every 4th point.
 */
export function formatPoints(pts: [number, number][]): string {
  const items = pts.map(([x, y]) => `[${fmt(x)}, ${fmt(y)}]`)
  if (items.length <= 8) {
    return `[${items.join(', ')}]`
  }
  const rows: string[] = []
  for (let i = 0; i < items.length; i += 4) {
    rows.push('  ' + items.slice(i, i + 4).join(', '))
  }
  return `[\n${rows.join(',\n')}\n]`
}
