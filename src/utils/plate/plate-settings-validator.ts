import type { PlateSettings, CutoutType, StabilizerType } from '@/types/plate'

export type ValidationResult =
  | { valid: true; settings: PlateSettings; warnings: string[] }
  | { valid: false; error: string }

const CUTOUT_TYPES: CutoutType[] = [
  'cherry-mx-basic',
  'cherry-mx-openable',
  'alps-skcm',
  'alps-skcp',
  'kailh-choc-cpg1350',
  'kailh-choc-cpg1232',
  'custom-rectangle',
]

const STABILIZER_TYPES: StabilizerType[] = [
  'mx-basic',
  'mx-bidirectional',
  'mx-tight',
  'mx-spec',
  'mx-spec-narrow',
  'alps-aek',
  'alps-at101',
  'none',
]

const OUTLINE_TYPES = ['none', 'rectangular', 'tight'] as const

// cutout sub-object known keys
const KNOWN_CUTOUT_KEYS_BASE = new Set([
  'switchType',
  'switchFilletRadius',
  'stabilizerType',
  'stabilizerFilletRadius',
  'kerf',
  'merge',
])
const KNOWN_CUTOUT_CUSTOM_KEYS = new Set(['width', 'height'])

const KNOWN_OUTLINE_KEYS_NONE = new Set(['outlineType'])
const KNOWN_OUTLINE_KEYS_RECTANGULAR = new Set([
  'outlineType',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'filletRadius',
  'mergeWithCutouts',
])
const KNOWN_OUTLINE_KEYS_TIGHT = new Set([
  'outlineType',
  'tightMargin',
  'filletRadius',
  'mergeWithCutouts',
])

const KNOWN_MOUNTING_HOLES_KEYS = new Set(['enabled', 'diameter', 'edgeDistance'])
const KNOWN_CUSTOM_HOLES_KEYS = new Set(['enabled', 'holes'])
const KNOWN_HOLE_KEYS = new Set(['diameter', 'offsetX', 'offsetY'])

const KNOWN_TOP_LEVEL_KEYS = new Set([
  'cutout',
  'thickness',
  'outline',
  'mountingHoles',
  'customHoles',
])

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v)
}

export function validatePlateSettingsJson(text: string): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return { valid: false, error: (err as SyntaxError).message }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Root value must be a JSON object' }
  }

  const obj = parsed as Record<string, unknown>
  const warnings: string[] = []

  // Validate cutout sub-object
  if ('cutout' in obj) {
    if (obj.cutout === null || typeof obj.cutout !== 'object' || Array.isArray(obj.cutout)) {
      return { valid: false, error: "'cutout' must be an object" }
    }
    const cutout = obj.cutout as Record<string, unknown>

    if ('switchType' in cutout && !CUTOUT_TYPES.includes(cutout.switchType as CutoutType)) {
      return {
        valid: false,
        error: `Invalid value for 'cutout.switchType': ${JSON.stringify(cutout.switchType)}`,
      }
    }
    if (
      'stabilizerType' in cutout &&
      !STABILIZER_TYPES.includes(cutout.stabilizerType as StabilizerType)
    ) {
      return {
        valid: false,
        error: `Invalid value for 'cutout.stabilizerType': ${JSON.stringify(cutout.stabilizerType)}`,
      }
    }

    for (const key of ['switchFilletRadius', 'kerf'] as const) {
      if (key in cutout && !isFiniteNumber(cutout[key])) {
        return { valid: false, error: `'cutout.${key}' must be a finite number` }
      }
    }

    if ('stabilizerFilletRadius' in cutout && !isFiniteNumber(cutout.stabilizerFilletRadius)) {
      return { valid: false, error: `'cutout.stabilizerFilletRadius' must be a finite number` }
    }

    const switchType = cutout.switchType as string | undefined
    if (switchType === 'custom-rectangle') {
      for (const key of ['width', 'height'] as const) {
        if (key in cutout && !isFiniteNumber(cutout[key])) {
          return { valid: false, error: `'cutout.${key}' must be a finite number` }
        }
      }
      for (const key of Object.keys(cutout)) {
        if (!KNOWN_CUTOUT_KEYS_BASE.has(key) && !KNOWN_CUTOUT_CUSTOM_KEYS.has(key))
          warnings.push(`Unknown field: cutout.${key}`)
      }
    } else {
      for (const key of Object.keys(cutout)) {
        if (!KNOWN_CUTOUT_KEYS_BASE.has(key)) warnings.push(`Unknown field: cutout.${key}`)
      }
    }
  }

  // Validate thickness
  if ('thickness' in obj && !isFiniteNumber(obj.thickness)) {
    return { valid: false, error: `'thickness' must be a finite number` }
  }

  // Validate outline sub-object
  if ('outline' in obj) {
    if (obj.outline === null || typeof obj.outline !== 'object' || Array.isArray(obj.outline)) {
      return { valid: false, error: "'outline' must be an object" }
    }
    const outline = obj.outline as Record<string, unknown>

    if (!('outlineType' in outline)) {
      return { valid: false, error: "Missing required field 'outline.outlineType'" }
    }
    const outlineType = outline.outlineType

    if (!OUTLINE_TYPES.includes(outlineType as (typeof OUTLINE_TYPES)[number])) {
      return {
        valid: false,
        error: `Invalid value for 'outline.outlineType': ${JSON.stringify(outlineType)}`,
      }
    }

    if (outlineType === 'rectangular') {
      for (const key of [
        'marginTop',
        'marginBottom',
        'marginLeft',
        'marginRight',
        'filletRadius',
      ] as const) {
        if (key in outline && !isFiniteNumber(outline[key])) {
          return { valid: false, error: `'outline.${key}' must be a finite number` }
        }
      }
      for (const key of Object.keys(outline)) {
        if (!KNOWN_OUTLINE_KEYS_RECTANGULAR.has(key)) warnings.push(`Unknown field: outline.${key}`)
      }
    } else if (outlineType === 'tight') {
      if ('tightMargin' in outline && !isFiniteNumber(outline.tightMargin)) {
        return { valid: false, error: `'outline.tightMargin' must be a finite number` }
      }
      if ('filletRadius' in outline && !isFiniteNumber(outline.filletRadius)) {
        return { valid: false, error: `'outline.filletRadius' must be a finite number` }
      }
      for (const key of Object.keys(outline)) {
        if (!KNOWN_OUTLINE_KEYS_TIGHT.has(key)) warnings.push(`Unknown field: outline.${key}`)
      }
    } else {
      for (const key of Object.keys(outline)) {
        if (!KNOWN_OUTLINE_KEYS_NONE.has(key)) warnings.push(`Unknown field: outline.${key}`)
      }
    }
  }

  // Validate mountingHoles (optional — omitted when disabled)
  if ('mountingHoles' in obj) {
    if (
      obj.mountingHoles === null ||
      typeof obj.mountingHoles !== 'object' ||
      Array.isArray(obj.mountingHoles)
    ) {
      return { valid: false, error: "'mountingHoles' must be an object" }
    }
    const mh = obj.mountingHoles as Record<string, unknown>
    for (const key of ['diameter', 'edgeDistance'] as const) {
      if (key in mh && !isFiniteNumber(mh[key])) {
        return { valid: false, error: `'mountingHoles.${key}' must be a finite number` }
      }
    }
    for (const key of Object.keys(mh)) {
      if (!KNOWN_MOUNTING_HOLES_KEYS.has(key)) warnings.push(`Unknown field: mountingHoles.${key}`)
    }
  }

  // Validate customHoles (optional — omitted when disabled and empty)
  if ('customHoles' in obj) {
    if (
      obj.customHoles === null ||
      typeof obj.customHoles !== 'object' ||
      Array.isArray(obj.customHoles)
    ) {
      return { valid: false, error: "'customHoles' must be an object" }
    }
    const ch = obj.customHoles as Record<string, unknown>

    if ('holes' in ch) {
      if (!Array.isArray(ch.holes)) {
        return { valid: false, error: "'customHoles.holes' must be an array" }
      }
      for (let i = 0; i < ch.holes.length; i++) {
        const hole = ch.holes[i]
        if (hole === null || typeof hole !== 'object' || Array.isArray(hole)) {
          return { valid: false, error: `'customHoles.holes[${i}]' must be an object` }
        }
        const h = hole as Record<string, unknown>
        for (const key of ['diameter', 'offsetX', 'offsetY'] as const) {
          if (!isFiniteNumber(h[key])) {
            return {
              valid: false,
              error: `'customHoles.holes[${i}].${key}' must be a finite number`,
            }
          }
        }
        for (const key of Object.keys(h)) {
          if (!KNOWN_HOLE_KEYS.has(key))
            warnings.push(`Unknown field: customHoles.holes[${i}].${key}`)
        }
      }
    }

    for (const key of Object.keys(ch)) {
      if (!KNOWN_CUSTOM_HOLES_KEYS.has(key)) warnings.push(`Unknown field: customHoles.${key}`)
    }
  }

  // Unknown top-level keys
  for (const key of Object.keys(obj)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) warnings.push(`Unknown field: ${key}`)
  }

  return { valid: true, settings: parsed as PlateSettings, warnings }
}
