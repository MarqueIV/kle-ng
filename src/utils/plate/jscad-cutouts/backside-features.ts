/**
 * JSCAD geometry for plate backside (back-face) features.
 * These are 3D solids subtracted from the extruded plate on the back face,
 * used for features like snap-in notches and stabilizer clearance. They do not
 * appear in 2D SVG/DXF output.
 */
import * as jscadModeling from '@jscad/modeling'
import { fmt, ScriptShapeRegistry } from './geom-utils'
import type { StabType } from './stabilizer-cutouts'

/** Width of the snap notch rectangle (mm). */
const SNAP_NOTCH_WIDTH = 7
/** Cherry MX switch cutout height (mm). */
const MX_CUTOUT_HEIGHT = 14
/** How far the notch extends beyond the top/bottom edges of the switch cutout (mm). */
const SNAP_NOTCH_OVERHANG = 1.5
/** Total notch height: spans the full switch cutout plus overhang on each side. */
const SNAP_NOTCH_HEIGHT = MX_CUTOUT_HEIGHT + 2 * SNAP_NOTCH_OVERHANG

// ---------------------------------------------------------------------------
// Stabilizer backside overhang offsets — tune per type as geometry is finalised
// ---------------------------------------------------------------------------

/** Extra clearance (mm) added beyond the stab bbox on each side for a backside cut. */
export interface StabBacksideOverhang {
  left: number
  right: number
  top: number
  bottom: number
}

/** Per-stabilizer-type overhang offsets. Values are placeholders — set to 0 until tuned. */
export const STAB_BACKSIDE_OVERHANGS: Record<StabType, StabBacksideOverhang> = {
  'mx-basic': { left: 0, right: 0, top: 3.5, bottom: 1.75 },
  'mx-tight': { left: 0, right: 0, top: 3.5, bottom: 1.75 },
  'mx-bidirectional': { left: 0, right: 0, top: 1.75, bottom: 1.75 },
  'mx-spec': { left: 0, right: 0, top: 1.31, bottom: 3 },
  'mx-spec-narrow': { left: 0, right: 0, top: 1.31, bottom: 3 },
  'alps-aek': { left: 0, right: 0, top: 0, bottom: 0 },
  'alps-at101': { left: 0, right: 0, top: 0, bottom: 0 },
}

export type Geom3 = ReturnType<typeof jscadModeling.primitives.cuboid>

export interface BacksideCut3D {
  varName: string
  /** Placed 3D solid ready for boolean subtraction from the extruded plate. */
  geom: Geom3
  /** JSCAD script lines; last line assigns `varName`. */
  scriptLines: string[]
}

// ---------------------------------------------------------------------------
// Snap-notch cut
// ---------------------------------------------------------------------------

/**
 * Build the Cherry MX snap-notch cut for a single key position.
 *
 * A single rectangle (7mm wide × 17mm tall) centered on the key, cutting from
 * the back face (z = 0) upward by `depth` mm.
 */
export function createCherryMxSnapNotchCuts(
  index: number,
  keyCenterX: number,
  keyCenterY: number,
  rotationDeg: number,
  depth: number,
  registry?: ScriptShapeRegistry,
): BacksideCut3D {
  const { cuboid } = jscadModeling.primitives
  const { translate, rotateZ } = jscadModeling.transforms

  const localGeom = translate(
    [0, 0, depth / 2],
    cuboid({ size: [SNAP_NOTCH_WIDTH, SNAP_NOTCH_HEIGHT, depth] }),
  ) as Geom3

  const rotRad = rotationDeg * (Math.PI / 180)
  const rotated = rotationDeg !== 0 ? (rotateZ(rotRad, localGeom) as Geom3) : localGeom
  const positioned = translate([keyCenterX, keyCenterY, 0], rotated) as Geom3

  const varName = `snap_notch_${index}`
  const w = fmt(SNAP_NOTCH_WIDTH)
  const nh = fmt(SNAP_NOTCH_HEIGHT)
  const d = fmt(depth)
  const dHalf = fmt(depth / 2)
  const cx = fmt(keyCenterX)
  const cy = fmt(keyCenterY)

  const cuboidExpr = `translate([0, 0, ${dHalf}], cuboid({ size: [${w}, ${nh}, ${d}] }))`
  const localExprFull = rotationDeg !== 0 ? `rotateZ(${fmt(rotRad)}, ${cuboidExpr})` : cuboidExpr

  let localExpr: string
  if (registry) {
    const shapeKey = `snap_notch:${w}:${nh}:${d}:${rotationDeg}`
    localExpr = registry.getOrCreate(shapeKey, 'snap_notch_shape', localExprFull)
  } else {
    localExpr = localExprFull
  }

  const finalExpr =
    keyCenterX !== 0 || keyCenterY !== 0 ? `translate([${cx}, ${cy}, 0], ${localExpr})` : localExpr

  return {
    varName,
    geom: positioned,
    scriptLines: [`const ${varName} = ${finalExpr}`],
  }
}

// ---------------------------------------------------------------------------
// Stabilizer clearance cuts
// ---------------------------------------------------------------------------

/**
 * Build a stabilizer clearance cut for a single key position.
 *
 * Uses the bounding box of the actual stab geometry (measured in stab-local
 * space before rotation/translation) to derive the rectangle dimensions,
 * ensuring the backside cut stays synchronized with the stab cutout.
 * The STAB_BACKSIDE_X/Y_OVERHANG offsets extend the bbox on each side.
 *
 * @param index - Key index (used to make variable names unique)
 * @param keyCenterX - Key center X in mm (JSCAD coordinate space)
 * @param keyCenterY - Key center Y in mm
 * @param totalStabRotationDeg - Total stab rotation in degrees (key rotation minus stabRotation), CCW positive
 * @param depth - Cut depth from back face in mm
 * @param localBbox - Bounding box of the stab pair in stab-local space, as returned
 *                    by jscadModeling.measurements.measureBoundingBox (two Vec3 entries).
 * @param overhang - Extra clearance to add beyond the bbox on each side.
 */
export function createStabBacksideCut(
  index: number,
  keyCenterX: number,
  keyCenterY: number,
  totalStabRotationDeg: number,
  depth: number,
  localBbox: [[number, number, number], [number, number, number]],
  overhang: StabBacksideOverhang,
  registry?: ScriptShapeRegistry,
): BacksideCut3D {
  const { cuboid } = jscadModeling.primitives
  const { translate, rotateZ } = jscadModeling.transforms

  const [[minX, minY], [maxX, maxY]] = localBbox
  const totalWidth = maxX - minX + overhang.left + overhang.right
  const totalHeight = maxY - minY + overhang.top + overhang.bottom
  const centerX = (minX + maxX) / 2 + (overhang.right - overhang.left) / 2
  const centerY = (minY + maxY) / 2 + (overhang.top - overhang.bottom) / 2

  const localGeom = translate(
    [centerX, centerY, depth / 2],
    cuboid({ size: [totalWidth, totalHeight, depth] }),
  ) as Geom3

  const rotRad = totalStabRotationDeg * (Math.PI / 180)
  const rotated = totalStabRotationDeg !== 0 ? (rotateZ(rotRad, localGeom) as Geom3) : localGeom
  const positioned = translate([keyCenterX, keyCenterY, 0], rotated) as Geom3

  const varName = `stab_backside_${index}`
  const rectExpr = `translate([${fmt(centerX)}, ${fmt(centerY)}, ${fmt(depth / 2)}], cuboid({ size: [${fmt(totalWidth)}, ${fmt(totalHeight)}, ${fmt(depth)}] }))`
  const localExprFull =
    totalStabRotationDeg !== 0 ? `rotateZ(${fmt(rotRad)}, ${rectExpr})` : rectExpr

  let localExpr: string
  if (registry) {
    const shapeKey = `stab_backside:${fmt(centerX)}:${fmt(centerY)}:${fmt(totalWidth)}:${fmt(totalHeight)}:${fmt(depth)}:${totalStabRotationDeg}`
    localExpr = registry.getOrCreate(shapeKey, 'stab_backside_shape', localExprFull)
  } else {
    localExpr = localExprFull
  }

  const finalExpr =
    keyCenterX !== 0 || keyCenterY !== 0
      ? `translate([${fmt(keyCenterX)}, ${fmt(keyCenterY)}, 0], ${localExpr})`
      : localExpr

  return {
    varName,
    geom: positioned,
    scriptLines: [`const ${varName} = ${finalExpr}`],
  }
}
