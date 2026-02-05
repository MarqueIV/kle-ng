/**
 * Cutout shape generators for plate generation
 *
 * This module provides generators for different switch cutout shapes.
 * Each generator creates a maker.js model representing the cutout shape.
 */

import type MakerJs from 'makerjs'
import type {
  CutoutType,
  CutoutOption,
  KeyCutoutPosition,
  StabilizerType,
  StabilizerOption,
} from '@/types/plate'
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

/**
 * Cherry MX Openable cutout: 14x14mm base with 4 symmetrical notches on side edges.
 *
 * Notch dimensions:
 * - Width: 0.8mm (extending outward from each side)
 * - Height: 3.1mm
 * - Position: 4.45mm from center (notch centers are 8.9mm apart)
 *
 * The notches allow the switch top to be opened without desoldering.
 * Max fillet radius is 0.4mm (limited by the 0.8mm notch width).
 */
export class CherryMxOpenableCutout implements CutoutGenerator {
  readonly width = 14
  readonly height = 14
  readonly notchWidth = 0.8
  readonly notchHeight = 3.1
  readonly notchOffset = 4.45 // Distance from center to notch center

  get maxFilletRadius(): number {
    // Limited by the smallest feature (notch width)
    return this.notchWidth / 2
  }

  createModel(
    makerjs: typeof MakerJs,
    filletRadius: number,
    sizeAdjust: number = 0,
  ): MakerJs.IModel {
    // Size adjustment (kerf compensation) applied to all edges
    const k = sizeAdjust

    // Adjusted base rectangle dimensions (bottom-left at origin, like Rectangle)
    const w = D.sub(this.width, D.mul(k, 2))
    const h = D.sub(this.height, D.mul(k, 2))

    // Center of the rectangle (for positioning notches)
    const centerY = D.div(h, 2)

    // Notch dimensions with size adjustment
    const notchW = D.sub(this.notchWidth, k) // Only subtract once (extends outward)
    const notchHalfH = D.sub(D.div(this.notchHeight, 2), k)

    // Notch Y positions (relative to rectangle with bottom-left at origin)
    const topNotchTop = D.add(centerY, D.add(this.notchOffset, notchHalfH))
    const topNotchBottom = D.add(centerY, D.sub(this.notchOffset, notchHalfH))
    const bottomNotchTop = D.add(centerY, D.sub(-this.notchOffset, -notchHalfH))
    const bottomNotchBottom = D.add(centerY, D.sub(-this.notchOffset, notchHalfH))

    // Right edge X positions
    const rightEdge = w
    const rightNotchOuter = D.add(w, notchW)

    // Left edge X positions
    const leftEdge = 0
    const leftNotchOuter = D.mul(notchW, -1)

    // Build the path clockwise from top-left corner
    // Rectangle spans (0,0) to (w,h), with notches extending beyond
    const model: MakerJs.IModel = {
      paths: {
        // Top edge
        top: new makerjs.paths.Line([0, h], [w, h]),

        // Right side with notches (going down)
        r1: new makerjs.paths.Line([rightEdge, h], [rightEdge, topNotchTop]),
        r2: new makerjs.paths.Line([rightEdge, topNotchTop], [rightNotchOuter, topNotchTop]),
        r3: new makerjs.paths.Line(
          [rightNotchOuter, topNotchTop],
          [rightNotchOuter, topNotchBottom],
        ),
        r4: new makerjs.paths.Line([rightNotchOuter, topNotchBottom], [rightEdge, topNotchBottom]),
        r5: new makerjs.paths.Line([rightEdge, topNotchBottom], [rightEdge, bottomNotchTop]),
        r6: new makerjs.paths.Line([rightEdge, bottomNotchTop], [rightNotchOuter, bottomNotchTop]),
        r7: new makerjs.paths.Line(
          [rightNotchOuter, bottomNotchTop],
          [rightNotchOuter, bottomNotchBottom],
        ),
        r8: new makerjs.paths.Line(
          [rightNotchOuter, bottomNotchBottom],
          [rightEdge, bottomNotchBottom],
        ),
        r9: new makerjs.paths.Line([rightEdge, bottomNotchBottom], [rightEdge, 0]),

        // Bottom edge
        bottom: new makerjs.paths.Line([w, 0], [0, 0]),

        // Left side with notches (going up)
        l1: new makerjs.paths.Line([leftEdge, 0], [leftEdge, bottomNotchBottom]),
        l2: new makerjs.paths.Line(
          [leftEdge, bottomNotchBottom],
          [leftNotchOuter, bottomNotchBottom],
        ),
        l3: new makerjs.paths.Line(
          [leftNotchOuter, bottomNotchBottom],
          [leftNotchOuter, bottomNotchTop],
        ),
        l4: new makerjs.paths.Line([leftNotchOuter, bottomNotchTop], [leftEdge, bottomNotchTop]),
        l5: new makerjs.paths.Line([leftEdge, bottomNotchTop], [leftEdge, topNotchBottom]),
        l6: new makerjs.paths.Line([leftEdge, topNotchBottom], [leftNotchOuter, topNotchBottom]),
        l7: new makerjs.paths.Line([leftNotchOuter, topNotchBottom], [leftNotchOuter, topNotchTop]),
        l8: new makerjs.paths.Line([leftNotchOuter, topNotchTop], [leftEdge, topNotchTop]),
        l9: new makerjs.paths.Line([leftEdge, topNotchTop], [leftEdge, h]),
      },
    }

    // Apply fillets to corners if requested
    if (filletRadius > 0) {
      const f = Math.min(filletRadius, this.maxFilletRadius)
      const paths = model.paths!

      // Corner fillets for main rectangle corners
      const cornerPairs: [string, string, string][] = [
        ['top', 'r1', 'fillet_tr'],
        ['r9', 'bottom', 'fillet_br'],
        ['bottom', 'l1', 'fillet_bl'],
        ['l9', 'top', 'fillet_tl'],
      ]

      // Notch corner fillets - right side
      const rightNotchPairs: [string, string, string][] = [
        ['r1', 'r2', 'fillet_r1'],
        ['r2', 'r3', 'fillet_r2'],
        ['r3', 'r4', 'fillet_r3'],
        ['r4', 'r5', 'fillet_r4'],
        ['r5', 'r6', 'fillet_r5'],
        ['r6', 'r7', 'fillet_r6'],
        ['r7', 'r8', 'fillet_r7'],
        ['r8', 'r9', 'fillet_r8'],
      ]

      // Notch corner fillets - left side
      const leftNotchPairs: [string, string, string][] = [
        ['l1', 'l2', 'fillet_l1'],
        ['l2', 'l3', 'fillet_l2'],
        ['l3', 'l4', 'fillet_l3'],
        ['l4', 'l5', 'fillet_l4'],
        ['l5', 'l6', 'fillet_l5'],
        ['l6', 'l7', 'fillet_l6'],
        ['l7', 'l8', 'fillet_l7'],
        ['l8', 'l9', 'fillet_l8'],
      ]

      const allPairs = [...cornerPairs, ...rightNotchPairs, ...leftNotchPairs]

      for (const [a, b, name] of allPairs) {
        const arc = makerjs.path.fillet(paths[a]!, paths[b]!, f)
        if (arc) {
          paths[name] = arc
        }
      }
    }

    return model
  }
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

export class CustomRectangleCutout extends RectangleCutout {
  readonly width: number
  readonly height: number

  constructor(width: number, height: number) {
    super()
    this.width = width
    this.height = height
  }
}

/**
 * Registry of cutout generators by type (excludes custom-rectangle which has dynamic dimensions)
 */
const cutoutGenerators: Record<string, CutoutGenerator> = {
  'cherry-mx-basic': new CherryMxBasicCutout(),
  'cherry-mx-openable': new CherryMxOpenableCutout(),
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
      value: 'cherry-mx-openable',
      label: 'Cherry MX Openable (14mm x 14mm)',
      description: 'Cherry MX cutout with side notches for opening switches without desoldering',
    },
    {
      value: 'alps-skcm',
      label: 'Alps SKCM/L (15.5mm x 12.8mm)',
      description: 'Cutout for Alps SKCM and SKCL switches',
    },
    {
      value: 'alps-skcp',
      label: 'Alps SKCP (16mm x 16mm)',
      description: 'Cutout for Alps SKCP switches',
    },
    {
      value: 'kailh-choc-cpg1350',
      label: 'Kailh Choc CPG1350 (14mm x 14mm)',
      description: 'Cutout for Choc V1 CPG1350, Chery MX compatible',
    },
    {
      value: 'kailh-choc-cpg1232',
      label: 'Kailh Choc CPG1232 (13.7mm x 12.7mm)',
      description: 'Cutout for Choc CPG1232 switches (Mini Choc)',
    },
    {
      value: 'custom-rectangle',
      label: 'Custom Rectangle',
      description: 'Custom rectangular cutout with user-defined dimensions',
    },
  ]
}

/**
 * Validate a fillet radius value for a given cutout type.
 * For custom-rectangle, pass the custom dimensions.
 * Returns an error message if invalid, or null if valid.
 */
export function validateFilletRadius(
  cutoutType: CutoutType,
  radius: number,
  customWidth?: number,
  customHeight?: number,
): string | null {
  if (radius < 0) {
    return 'Fillet radius cannot be negative.'
  }
  const generator = getCutoutGenerator(cutoutType, customWidth, customHeight)
  if (radius > generator.maxFilletRadius) {
    return `Fillet radius cannot exceed ${generator.maxFilletRadius}mm (half of the smallest cutout dimension).`
  }
  return null
}

/**
 * Get the maximum allowed stabilizer fillet radius for a given stabilizer type.
 * - mx-basic: 3.5mm (min(7, 15) / 2)
 * - mx-spec: 0.4mm (limited by the smallest feature — the cross-mount notch)
 * - alps-aek: 1.3mm (min(2.67, 5.21) / 2)
 * - none: 0 (no stabilizer)
 */
export function getMaxStabilizerFilletRadius(stabilizerType: StabilizerType): number {
  if (stabilizerType === 'mx-spec' || stabilizerType === 'mx-spec-narrow') return 0.4
  if (stabilizerType === 'mx-basic') return 3.5
  if (stabilizerType === 'alps-aek' || stabilizerType === 'alps-at101') return 1.3
  return 0
}

/**
 * Validate a stabilizer fillet radius value for a given stabilizer type.
 * Returns an error message if invalid, or null if valid.
 */
export function validateStabilizerFilletRadius(
  stabilizerType: StabilizerType,
  radius: number,
): string | null {
  if (stabilizerType === 'none') return null
  if (radius < 0) {
    return 'Stabilizer fillet radius cannot be negative.'
  }
  const maxRadius = getMaxStabilizerFilletRadius(stabilizerType)
  if (radius > maxRadius) {
    return `Stabilizer fillet radius cannot exceed ${maxRadius}mm for this stabilizer type.`
  }
  return null
}

/**
 * Get a cutout generator by type.
 * For 'custom-rectangle', pass the custom dimensions.
 */
export function getCutoutGenerator(
  type: CutoutType,
  customWidth?: number,
  customHeight?: number,
): CutoutGenerator {
  if (type === 'custom-rectangle') {
    return new CustomRectangleCutout(customWidth ?? 14, customHeight ?? 14)
  }
  const generator = cutoutGenerators[type]
  if (!generator) {
    throw new Error(`Unknown cutout type: ${type}`)
  }
  return generator
}

/**
 * Validate a custom cutout dimension (width or height).
 * Returns an error message if invalid, or null if valid.
 */
export function validateCustomCutoutDimension(
  value: number,
  maxValue: number,
  label: string,
): string | null {
  if (value <= 0) {
    return `Custom cutout ${label} must be greater than 0.`
  }
  if (value > maxValue) {
    return `Custom cutout ${label} cannot exceed ${maxValue}mm (key spacing).`
  }
  return null
}

/**
 * Get the Cherry MX stabilizer spacing (in mm) for a given key size in units.
 * Returns null if key size < 2 (no stabilizer needed).
 */
function getCherryMxStabilizerSpacing(keySize: number): number | null {
  if (keySize >= 8) return 66.675
  if (keySize >= 7) return 57.15
  if (keySize >= 6.25) return 50
  if (keySize >= 6) return 47.625
  if (keySize >= 3) return 19.05
  if (keySize >= 2) return 11.938
  return null
}

/**
 * Alps stabilizer spacing table.
 * AT101 has an additional threshold at 2.75U.
 */
const alpsSpacingTable: { minKeySize: number; spacing: number; at101Only?: boolean }[] = [
  { minKeySize: 6.5, spacing: 45.3 },
  { minKeySize: 6.25, spacing: 41.86 },
  { minKeySize: 2.75, spacing: 20.5, at101Only: true },
  { minKeySize: 2, spacing: 14 },
  { minKeySize: 1.75, spacing: 12 },
]

/**
 * Get the Alps stabilizer spacing (in mm) for a given key size in units.
 * Returns null if key size < 1.75 (no stabilizer needed).
 */
function getAlpsStabilizerSpacing(keySize: number, isAt101: boolean): number | null {
  for (const { minKeySize, spacing, at101Only } of alpsSpacingTable) {
    if (at101Only && !isAt101) continue
    if (keySize >= minKeySize) return spacing
  }
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
      description: 'Typical Cherry MX stabilizer cutout suited for most occasions',
    },
    {
      value: 'mx-spec',
      label: 'Cherry MX Spec (6.65mm x 12.29mm)',
      description:
        'Spec-accurate Cherry MX stabilizer cutout with wire channel and plate mount clip cuts',
    },
    {
      value: 'mx-spec-narrow',
      label: 'Cherry MX Spec Narrow (6.65mm x 12.29mm)',
      description:
        'Almost spec-accurate Cherry MX stabilizer cutout but with narrow wire channel for all key sizes',
    },
    {
      value: 'alps-aek',
      label: 'Alps AEK (2.67mm x 5.21mm)',
      description: 'Alps specific for AEK stabilizer sizes',
    },
    {
      value: 'alps-at101',
      label: 'Alps AT101 (2.67mm x 5.21mm)',
      description: 'Alps specific for AT101 stabilizer sizes',
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
export function createStabilizerMxBasicModel(
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

  const spacing = getCherryMxStabilizerSpacing(keySize)
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
 * Create a spec-accurate Cherry MX stabilizer cutout model for a key.
 *
 * Each stabilizer consists of two complex-profile cutouts with:
 * - Main housing body (~6.65mm x 12.29mm)
 * - Bottom clip notch (~3.05mm x 1.17mm)
 * - Side notch (~0.86mm x 2.79mm)
 * - Horizontal wire channel connecting the two cutouts
 *
 * Based on Cherry MX stabilizer spec sheet dimensions.
 * Reference: yet-another-keyboard-builder StabilizerMXSpec.js
 *
 * @param makerjs - The maker.js library
 * @param keyWidth - Key width in keyboard units
 * @param keyHeight - Key height in keyboard units
 * @param filletRadius - Fillet radius in mm
 * @param sizeAdjust - Size adjustment in mm (positive = shrink)
 * @returns A maker.js model with two stabilizer cutouts, or null if key < 2U
 */
export function createStabilizerMxSpecModel(
  makerjs: typeof MakerJs,
  keyWidth: number,
  keyHeight: number,
  filletRadius: number,
  sizeAdjust: number,
  narrowChannel: boolean = false,
): MakerJs.IModel | null {
  let keySize = keyWidth
  const isVertical = keyHeight > keyWidth
  if (isVertical) {
    keySize = keyHeight
  }

  const spacing = getCherryMxStabilizerSpacing(keySize)
  if (spacing === null) return null

  // sizeAdjust works like kerf: positive = shrink cutouts
  const k = sizeAdjust

  // Left cutout points (clockwise from top-left)
  // Main housing body
  const pA: [number, number] = [D.add(-3.3274, k), D.sub(5.6896, k)]
  const pB: [number, number] = [D.sub(3.3274, k), D.sub(5.6896, k)]
  const pC: [number, number] = [D.sub(3.3274, k), D.add(-6.604, k)]
  // Bottom wire clip extension
  const pD: [number, number] = [D.sub(1.524, k), D.add(-6.604, k)]
  const pE: [number, number] = [D.sub(1.524, k), D.add(-7.7724, k)]
  const pF: [number, number] = [D.add(-1.524, k), D.add(-7.7724, k)]
  const pG: [number, number] = [D.add(-1.524, k), D.add(-6.604, k)]
  const pH: [number, number] = [D.add(-3.3274, k), D.add(-6.604, k)]
  // Cross-mount notch on left side
  const pI: [number, number] = [D.add(-3.3274, k), D.add(-0.508, k)]
  const pJ: [number, number] = [D.add(-4.191, k), D.add(-0.508, k)]
  const pK: [number, number] = [D.add(-4.191, k), D.sub(2.286, k)]
  const pL: [number, number] = [D.add(-3.3274, k), D.sub(2.286, k)]

  // Horizontal wire channel points (vary by key size)
  // For keys >= 3U the channel is narrower (4.6mm tall)
  // For keys < 3U the channel is wider (10.69mm tall) to allow bar insertion
  let pW: [number, number], pX: [number, number]
  let pY: [number, number], pZ: [number, number]

  if (narrowChannel || keySize >= 3) {
    pW = [D.sub(3.3274, k), D.sub(2.3, k)]
    pZ = [D.sub(3.3274, k), D.add(-2.3, k)]
    pX = [spacing, D.sub(2.3, k)]
    pY = [spacing, D.add(-2.3, k)]
  } else {
    pW = [D.sub(3.3274, k), D.sub(4.8768, k)]
    pZ = [D.sub(3.3274, k), D.add(-5.8166, k)]
    pX = [spacing, D.sub(4.8768, k)]
    pY = [spacing, D.add(-5.8166, k)]
  }

  // Build left cutout as line segments
  const leftCutout: MakerJs.IModel = {
    paths: {
      line1: new makerjs.paths.Line(pA, pB),
      line2a: new makerjs.paths.Line(pB, pW),
      line2b: new makerjs.paths.Line(pW, pX),
      line2c: new makerjs.paths.Line(pY, pZ),
      line2d: new makerjs.paths.Line(pZ, pC),
      line3: new makerjs.paths.Line(pC, pD),
      line4: new makerjs.paths.Line(pD, pE),
      line5: new makerjs.paths.Line(pE, pF),
      line6: new makerjs.paths.Line(pF, pG),
      line7: new makerjs.paths.Line(pG, pH),
      line8: new makerjs.paths.Line(pH, pI),
      line9: new makerjs.paths.Line(pI, pJ),
      line10: new makerjs.paths.Line(pJ, pK),
      line11: new makerjs.paths.Line(pK, pL),
      line12: new makerjs.paths.Line(pL, pA),
    },
  }

  // Build right cutout — clone left, then mirror on X axis
  const rightCutout = makerjs.model.mirror(makerjs.model.clone(leftCutout), true, false)

  // Apply fillets to all corners
  if (filletRadius > 0) {
    const maxFillet = getMaxStabilizerFilletRadius('mx-spec')
    const f = Math.min(filletRadius, maxFillet)

    const filletPairs: [string, string, string][] = [
      ['line1', 'line2a', 'fillet1'],
      ['line2a', 'line2b', 'fillet1a'],
      ['line2c', 'line2d', 'fillet1b'],
      ['line2d', 'line3', 'fillet2'],
      ['line3', 'line4', 'fillet3'],
      ['line4', 'line5', 'fillet4'],
      ['line5', 'line6', 'fillet5'],
      ['line6', 'line7', 'fillet6'],
      ['line7', 'line8', 'fillet7'],
      ['line8', 'line9', 'fillet8'],
      ['line9', 'line10', 'fillet9'],
      ['line10', 'line11', 'fillet10'],
      ['line11', 'line12', 'fillet11'],
      ['line12', 'line1', 'fillet12'],
    ]

    for (const cutout of [leftCutout, rightCutout]) {
      const paths = cutout.paths!
      for (const [a, b, name] of filletPairs) {
        const arc = makerjs.path.fillet(paths[a]!, paths[b]!, f)
        if (arc) {
          paths[name] = arc
        }
      }
    }
  }

  // Position cutouts at stabilizer spacing
  const positionedLeft = makerjs.model.move(leftCutout, [-spacing, 0])
  const positionedRight = makerjs.model.move(rightCutout, [spacing, 0])

  let stabModel: MakerJs.IModel = {
    models: {
      left: positionedLeft,
      right: positionedRight,
    },
  }

  // Rotate -90 degrees for vertical keys
  if (isVertical) {
    stabModel = makerjs.model.rotate(stabModel, -90)
  }

  return stabModel
}

export function createStabilizerAlpsModel(
  makerjs: typeof MakerJs,
  stabilizerType: 'alps-aek' | 'alps-at101',
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

  const spacing = getAlpsStabilizerSpacing(keySize, stabilizerType === 'alps-at101')
  if (spacing === null) return null

  const stabWidth = 2.67
  const stabHeight = 5.21

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
    // y: bottom at -9.085 + sizeAdjust
    const moveX = D.add(D.div(w, -2), xOffset)
    const moveY = D.add(-9.085, sizeAdjust)
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
  customWidth?: number,
  customHeight?: number,
): Promise<MakerJs.IModel> {
  const makerjs = await getMakerJs()
  const generator = getCutoutGenerator(cutoutType, customWidth, customHeight)

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
