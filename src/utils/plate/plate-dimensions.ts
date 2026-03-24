/**
 * Shared dimension constants for plate stabilizer generation.
 * Used by both the maker.js (cutout-generator.ts) and JSCAD (jscad-cutouts/) implementations
 * to ensure a single source of truth for all spacing and dimension values.
 */

/**
 * Get the Cherry MX stabilizer spacing (in mm) for a given key size in units.
 * Returns null if key size < 2 (no stabilizer needed).
 */
export function getCherryMxStabilizerSpacing(keySize: number): number | null {
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
export const alpsSpacingTable: { minKeySize: number; spacing: number; at101Only?: boolean }[] = [
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
export function getAlpsStabilizerSpacing(keySize: number, isAt101: boolean): number | null {
  for (const { minKeySize, spacing, at101Only } of alpsSpacingTable) {
    if (at101Only && !isAt101) continue
    if (keySize >= minKeySize) return spacing
  }
  return null
}

/** Dimensions for mx-basic stabilizer pads */
export const MX_BASIC_STAB = { width: 7, height: 15, moveYBase: -9 } as const
/** Dimensions for mx-bidirectional stabilizer pads */
export const MX_BIDIRECTIONAL_STAB = { width: 7, height: 18, moveYBase: -9 } as const
/** Dimensions for mx-tight stabilizer pads */
export const MX_TIGHT_STAB = { width: 6.75, height: 14, moveYBase: -8 } as const
/** Dimensions for Alps stabilizer pads */
export const ALPS_STAB = { width: 2.67, height: 5.21, moveYBase: -9.085 } as const

/**
 * Get Cherry MX (basic/tight/bidirectional) stabilizer pad dimensions.
 */
export function getMxBasicStabDimensions(type: 'mx-basic' | 'mx-tight' | 'mx-bidirectional'): {
  width: number
  height: number
  moveYBase: number
} {
  if (type === 'mx-tight') return MX_TIGHT_STAB
  if (type === 'mx-bidirectional') return MX_BIDIRECTIONAL_STAB
  return MX_BASIC_STAB
}

/**
 * Get the MX spec stabilizer left pad vertices as a closed polygon (16 points).
 * The polygon includes the main housing body, wire channel extension, bottom wire clip
 * notch, and cross-mount notch. The wire channel extends to x=+spacing so that
 * when both pads are unioned (left at -spacing, right at +spacing), the channels
 * meet at x=0 forming a continuous wire slot.
 *
 * Winding: clockwise (negate X + reverse for CCW right pad).
 *
 * @param k - Per-side kerf compensation (sizeAdjust / 2). Positive = shrink.
 * @param spacing - Half center-to-center distance (mm)
 * @param keySize - Key size in units (controls wire channel height)
 * @param narrowChannel - Use narrow wire channel regardless of key size
 */
export function getMxSpecLeftPadVertices(
  k: number,
  spacing: number,
  keySize: number,
  narrowChannel: boolean,
): [number, number][] {
  // Main housing top edge
  const pA: [number, number] = [-3.3274 + k, 5.6896 - k]
  const pB: [number, number] = [3.3274 - k, 5.6896 - k]

  // Wire channel junction and far-edge points
  let pW: [number, number], pX: [number, number], pY: [number, number], pZ: [number, number]
  if (narrowChannel || keySize >= 3) {
    pW = [3.3274 - k, 2.3 - k]
    pX = [spacing, 2.3 - k]
    pY = [spacing, -2.3 + k]
    pZ = [3.3274 - k, -2.3 + k]
  } else {
    pW = [3.3274 - k, 4.8768 - k]
    pX = [spacing, 4.8768 - k]
    pY = [spacing, -5.8166 + k]
    pZ = [3.3274 - k, -5.8166 + k]
  }

  // Bottom of housing body
  const pC: [number, number] = [3.3274 - k, -6.604 + k]
  // Bottom wire clip notch (U-wire slot)
  const pD: [number, number] = [1.524 - k, -6.604 + k]
  const pE: [number, number] = [1.524 - k, -7.7724 + k]
  const pF: [number, number] = [-1.524 + k, -7.7724 + k]
  const pG: [number, number] = [-1.524 + k, -6.604 + k]
  const pH: [number, number] = [-3.3274 + k, -6.604 + k]
  // Cross-mount notch on left side
  const pI: [number, number] = [-3.3274 + k, -0.508 + k]
  const pJ: [number, number] = [-4.191 + k, -0.508 + k]
  const pK: [number, number] = [-4.191 + k, 2.286 - k]
  const pL: [number, number] = [-3.3274 + k, 2.286 - k]

  // Clockwise polygon. Right pad = negate all X + reverse for CCW.
  return [pA, pB, pW, pX, pY, pZ, pC, pD, pE, pF, pG, pH, pI, pJ, pK, pL]
}
