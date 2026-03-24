/**
 * JSCAD switch cutout generators.
 * No maker.js dependency.
 *
 * All shapes are centered at the origin. Callers use placeGeom2() to position them.
 */
import * as jscadModeling from '@jscad/modeling'
import { fmt, fmtVec2, type Geom2 } from './geom-utils'

const { rectangle, roundedRectangle } = jscadModeling.primitives
const { union } = jscadModeling.booleans
const { translate } = jscadModeling.transforms

export interface SwitchCutoutOptions {
  /** Cutout width in mm (after sizeAdjust applied by caller) */
  width: number
  /** Cutout height in mm (after sizeAdjust applied by caller) */
  height: number
  /** Corner fillet radius in mm (0 = sharp corners) */
  filletRadius?: number
  /**
   * Total kerf compensation in mm (positive = shrink).
   * Used by cherry-mx-openable to also shrink notch dimensions, matching
   * the maker.js implementation which applies k = sizeAdjust/2 per side.
   */
  sizeAdjust?: number
}

/**
 * Create a rectangular (or rounded-rectangle) switch cutout geometry.
 * Used for: cherry-mx-basic, alps-skcm, alps-skcp, kailh-choc-cpg1350,
 * kailh-choc-cpg1232, custom-rectangle.
 */
export function createRectangleSwitchGeom(opts: SwitchCutoutOptions): Geom2 {
  const { width, height, filletRadius = 0 } = opts
  if (filletRadius > 0) {
    return roundedRectangle({ size: [width, height], roundRadius: filletRadius }) as Geom2
  }
  return rectangle({ size: [width, height] }) as Geom2
}

/**
 * Build JSCAD script lines for a rectangle/roundedRectangle switch cutout.
 *
 * @param varName - Variable name (e.g. 'switch_0')
 * @param opts - Cutout options
 * @param centerX - Final center X in mm
 * @param centerY - Final center Y in mm
 * @param rotationDeg - Rotation in degrees (CCW positive)
 * @param comment - Optional inline comment
 */
export function buildRectangleSwitchScript(
  varName: string,
  opts: SwitchCutoutOptions,
  centerX: number,
  centerY: number,
  rotationDeg: number,
  comment?: string,
): string[] {
  const { width, height, filletRadius = 0 } = opts
  const roundStr = filletRadius > 0 ? `, roundRadius: ${fmt(filletRadius)}` : ''
  const sizeStr = `size: [${fmt(width)}, ${fmt(height)}]`
  const primitive =
    filletRadius > 0 ? `roundedRectangle({ ${sizeStr}${roundStr} })` : `rectangle({ ${sizeStr} })`

  let expr = primitive
  if (rotationDeg !== 0) {
    expr = `rotateZ(${fmt(rotationDeg * (Math.PI / 180))}, ${expr})`
  }
  if (centerX !== 0 || centerY !== 0) {
    expr = `translate(${fmtVec2(centerX, centerY)}, ${expr})`
  }
  const suffix = comment ? `  // ${comment}` : ''
  return [`const ${varName} = ${expr}${suffix}`]
}

/**
 * Cherry MX Openable cutout constants.
 * 14x14mm base with 4 symmetrical rectangular notches on left and right edges.
 */
const MX_OPENABLE_NOTCH_WIDTH = 0.8
const MX_OPENABLE_NOTCH_HEIGHT = 3.1
const MX_OPENABLE_NOTCH_OFFSET = 4.45 // distance from center to notch center

/**
 * Create a Cherry MX Openable cutout geometry.
 *
 * Constructed as: union(base, 4 notch rectangles)
 * Notches extend OUTWARD from each side of the base (same geometry as the maker.js
 * implementation in CherryMxOpenableCutout.createModel). No arcs — all features are rectangles.
 */
export function createCherryMxOpenableGeom(opts: SwitchCutoutOptions): Geom2 {
  const { width, height, filletRadius = 0, sizeAdjust = 0 } = opts
  // width/height are already adjusted by the caller. sizeAdjust is additionally
  // needed here to shrink the notches, matching maker.js which applies k = sizeAdjust/2
  // per side to both notch width and height.
  const k = sizeAdjust / 2
  const base: Geom2 =
    filletRadius > 0
      ? (roundedRectangle({ size: [width, height], roundRadius: filletRadius }) as Geom2)
      : (rectangle({ size: [width, height] }) as Geom2)

  const nW = MX_OPENABLE_NOTCH_WIDTH - k
  const nH = MX_OPENABLE_NOTCH_HEIGHT - 2 * k
  const nOff = MX_OPENABLE_NOTCH_OFFSET

  // 4 notches: top and bottom on each side.
  // Each notch center is just outside the base edge (inner edge flush with base edge),
  // extending outward by nW — widening the total cutout to width + 2*nW.
  const rightX = width / 2 + nW / 2 // notch center X on right side
  const leftX = -(width / 2 + nW / 2)

  const notchRight = (y: number): Geom2 =>
    translate([rightX, y, 0], rectangle({ size: [nW, nH] })) as Geom2
  const notchLeft = (y: number): Geom2 =>
    translate([leftX, y, 0], rectangle({ size: [nW, nH] })) as Geom2

  const allNotches = union(
    notchRight(nOff),
    notchRight(-nOff),
    notchLeft(nOff),
    notchLeft(-nOff),
  ) as Geom2

  return union(base, allNotches) as Geom2
}

/**
 * Build JSCAD script lines for a Cherry MX Openable cutout.
 * Emits parametric union of base + 4 notch rectangles (no polygon point array).
 */
export function buildCherryMxOpenableScript(
  varName: string,
  opts: SwitchCutoutOptions,
  centerX: number,
  centerY: number,
  rotationDeg: number,
  comment?: string,
): string[] {
  const { width, height, filletRadius = 0, sizeAdjust = 0 } = opts
  const k = sizeAdjust / 2
  const nW = MX_OPENABLE_NOTCH_WIDTH - k
  const nH = MX_OPENABLE_NOTCH_HEIGHT - 2 * k
  const nOff = MX_OPENABLE_NOTCH_OFFSET
  const rightX = fmt(width / 2 + nW / 2)
  const leftX = fmt(-(width / 2 + nW / 2))
  const offStr = fmt(nOff)
  const negOffStr = fmt(-nOff)
  const notchSizeStr = `[${fmt(nW)}, ${fmt(nH)}]`

  const lines: string[] = []
  const b = varName
  const roundStr = filletRadius > 0 ? `, roundRadius: ${fmt(filletRadius)}` : ''
  const basePrimitive =
    filletRadius > 0
      ? `roundedRectangle({ size: [${fmt(width)}, ${fmt(height)}]${roundStr} })`
      : `rectangle({ size: [${fmt(width)}, ${fmt(height)}] })`
  lines.push(`const ${b}_base = ${basePrimitive}`)
  lines.push(
    `const ${b}_nr_top = translate([${rightX}, ${offStr}, 0], rectangle({ size: ${notchSizeStr} }))`,
  )
  lines.push(
    `const ${b}_nr_bot = translate([${rightX}, ${negOffStr}, 0], rectangle({ size: ${notchSizeStr} }))`,
  )
  lines.push(
    `const ${b}_nl_top = translate([${leftX}, ${offStr}, 0], rectangle({ size: ${notchSizeStr} }))`,
  )
  lines.push(
    `const ${b}_nl_bot = translate([${leftX}, ${negOffStr}, 0], rectangle({ size: ${notchSizeStr} }))`,
  )
  lines.push(`const ${b}_notches = union(${b}_nr_top, ${b}_nr_bot, ${b}_nl_top, ${b}_nl_bot)`)

  let inner = `union(${b}_base, ${b}_notches)`
  if (rotationDeg !== 0) {
    inner = `rotateZ(${fmt(rotationDeg * (Math.PI / 180))}, ${inner})`
  }
  if (centerX !== 0 || centerY !== 0) {
    inner = `translate(${fmtVec2(centerX, centerY)}, ${inner})`
  }
  const suffix = comment ? `  // ${comment}` : ''
  lines.push(`const ${varName} = ${inner}${suffix}`)
  return lines
}

// ---------------------------------------------------------------------------
// Dispatch helpers
// ---------------------------------------------------------------------------

/**
 * Determine if the given cutout type uses the simple rectangle generator.
 */
export function isRectangleSwitchType(cutoutType: string): boolean {
  return cutoutType !== 'cherry-mx-openable'
}
