import { Key, Serial } from '@adamws/kle-serial'
import LZString from 'lz-string'

const matrixLabelPattern = /^(\d+),(\d+)$/
const optionChoicePattern = /^(\d+),(\d+)$/

function isMatrixLabel(label: unknown): label is string {
  return typeof label === 'string' && matrixLabelPattern.test(label.trim())
}

function parseOptionChoice(label: unknown): { option: number; choice: number } | null {
  if (!label || typeof label !== 'string') return null
  const trimmed = label.trim()
  const match = trimmed.match(optionChoicePattern)
  if (!match) return null
  return { option: parseInt(match[1]!), choice: parseInt(match[2]!) }
}

/**
 * Detect which label index stores option/choice data.
 *
 * Priority: if any annotated key already has a valid option/choice at the VIA-standard
 * position (index 8), use that. Otherwise scan positions 1-11 for the index where ALL
 * duplicate-matrix groups have a valid "N,M" label (that's the discriminator position).
 * Falls back to 8 if nothing is found.
 */
function findOptionChoicePosition(keys: Key[]): number {
  // 1. Prefer VIA-standard position 8
  if (keys.some((k) => parseOptionChoice(k.labels[8]) !== null)) return 8

  // 2. Group by matrix position; find which label index discriminates duplicates
  const byMatrix = new Map<string, Key[]>()
  for (const key of keys) {
    const pos = key.labels[0]?.trim()
    if (!pos) continue
    const list = byMatrix.get(pos) ?? []
    list.push(key)
    byMatrix.set(pos, list)
  }

  const duplicateGroups = [...byMatrix.values()].filter((g) => g.length > 1)
  if (duplicateGroups.length === 0) return 8

  for (let p = 1; p < 12; p++) {
    if (p === 8) continue // already checked
    const allDiscriminated = duplicateGroups.every((group) =>
      group.every((k) => parseOptionChoice(k.labels[p]) !== null),
    )
    if (allDiscriminated) return p
  }

  return 8 // fallback
}

interface QmkKey {
  matrix: [number, number]
  x: number
  y: number
  w?: number
  h?: number
  r?: number
  rx?: number
  ry?: number
}

interface QmkLayout {
  layout: QmkKey[]
}

interface StoredQmkData {
  keyboard_name?: string
  manufacturer?: string
  layouts?: Record<string, Record<string, never>>
  [key: string]: unknown
}

/** Round to 6 decimal places to remove floating-point noise from kle-serial arithmetic. */
function rd(v: number): number {
  return parseFloat(v.toFixed(6))
}

function isQmkKey(val: unknown): val is QmkKey {
  return (
    typeof val === 'object' &&
    val !== null &&
    !Array.isArray(val) &&
    'matrix' in val &&
    'x' in val &&
    'y' in val
  )
}

function compactQmkKey(key: QmkKey): string {
  const parts: string[] = [`"matrix": [${key.matrix.join(', ')}]`]
  for (const [k, v] of Object.entries(key)) {
    if (k !== 'matrix') parts.push(`${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  }
  return `{${parts.join(', ')}}`
}

function stringifyValue(val: unknown, depth: number): string {
  if (val === null || typeof val !== 'object') return JSON.stringify(val)
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    const pad = '  '.repeat(depth + 1)
    const close = '  '.repeat(depth)
    return `[\n${val.map((item) => `${pad}${stringifyValue(item, depth + 1)}`).join(',\n')}\n${close}]`
  }
  if (isQmkKey(val)) return compactQmkKey(val)
  const keys = Object.keys(val as object)
  if (keys.length === 0) return '{}'
  const pad = '  '.repeat(depth + 1)
  const close = '  '.repeat(depth)
  const entries = keys.map(
    (k) =>
      `${pad}${JSON.stringify(k)}: ${stringifyValue((val as Record<string, unknown>)[k], depth + 1)}`,
  )
  return `{\n${entries.join(',\n')}\n${close}}`
}

/** Serialize QMK info.json with layout key entries compacted to one line each. */
export function formatQmkJson(data: unknown): string {
  return stringifyValue(data, 0)
}

function reconstructQmkKey(key: Key): QmkKey {
  const label = key.labels[0] ?? ''
  const parts = label.split(',').map(Number)
  const row = parts[0] ?? 0
  const col = parts[1] ?? 0

  const x = rd(key.x)
  const y = rd(key.y)
  const w = rd(key.width)
  const h = rd(key.height)
  const r = rd(key.rotation_angle)
  const rx = rd(key.rotation_x)
  const ry = rd(key.rotation_y)

  const qmkKey: QmkKey = { matrix: [row, col], x, y }

  if (w !== 1) qmkKey.w = w
  if (h !== 1) qmkKey.h = h
  if (r !== 0) qmkKey.r = r
  if (rx !== 0) qmkKey.rx = rx
  if (ry !== 0) qmkKey.ry = ry

  return qmkKey
}

function sortByMatrix(a: QmkKey, b: QmkKey): number {
  if (a.matrix[0] !== b.matrix[0]) return a.matrix[0] - b.matrix[0]
  return a.matrix[1] - b.matrix[1]
}

/**
 * Convert KLE keyboard data to QMK info.json format.
 *
 * Returns null if no regular keys have valid matrix coordinates in labels[0].
 *
 * Alternative layouts are detected by scanning for option/choice labels (format "N,M")
 * at any label position — defaulting to the VIA-standard position 8, but also supporting
 * position 3 (3 newlines in KLE label string) used by some KLE files.
 * Layouts are grouped by choice number; the option number is ignored so that multiple
 * independent VIA options (e.g. 1,0 / 5,0 for choice 0, 1,1 / 5,1 for choice 1) are
 * merged into the same QMK layout.
 *
 * Floating-point noise introduced by kle-serial's rotation-origin arithmetic is removed
 * by rounding all coordinates to 6 decimal places.
 *
 * Uses stored _kleng_qmk_data for original metadata and layout names when available.
 */
export function convertKleToQmk(kleData: unknown): unknown | null {
  // Deserialize to Keyboard object
  let keyboard
  try {
    if (Array.isArray(kleData)) {
      keyboard = Serial.deserialize(kleData)
    } else if (
      typeof kleData === 'object' &&
      kleData !== null &&
      'keys' in kleData &&
      'meta' in kleData
    ) {
      keyboard = kleData as { keys: Key[]; meta: Record<string, unknown> }
    } else {
      return null
    }
  } catch {
    return null
  }

  const allKeys: Key[] = keyboard.keys as Key[]
  const meta = keyboard.meta as Record<string, unknown>

  // Filter to matrix-annotated regular keys
  const annotatedKeys = allKeys.filter(
    (key) => !key.decal && !key.ghost && isMatrixLabel(key.labels[0]),
  )

  if (annotatedKeys.length === 0) return null

  // Parse stored QMK metadata
  let storedQmk: StoredQmkData | null = null
  const storedRaw = meta._kleng_qmk_data
  if (typeof storedRaw === 'string') {
    try {
      const decompressed = LZString.decompressFromBase64(storedRaw)
      if (decompressed) {
        storedQmk = JSON.parse(decompressed) as StoredQmkData
      }
    } catch {
      // ignore corrupt data
    }
  }

  // Detect which label position holds option/choice data
  const optPos = findOptionChoicePosition(annotatedKeys)

  // Collect all unique choice numbers across all option groups
  const choiceSet = new Set<number>()
  for (const key of annotatedKeys) {
    const oc = parseOptionChoice(key.labels[optPos])
    if (oc) choiceSet.add(oc.choice)
  }

  const numLayouts = choiceSet.size === 0 ? 1 : Math.max(...choiceSet) + 1

  // Determine layout names
  const storedLayoutNames = storedQmk?.layouts ? Object.keys(storedQmk.layouts) : []
  const layoutNames: string[] = []
  for (let i = 0; i < numLayouts; i++) {
    if (storedLayoutNames[i]) {
      layoutNames.push(storedLayoutNames[i]!)
    } else if (numLayouts === 1) {
      layoutNames.push('LAYOUT')
    } else {
      layoutNames.push(`LAYOUT_${i}`)
    }
  }

  // Shared keys: no valid option/choice label at the detected position
  const sharedKeys = annotatedKeys.filter((key) => parseOptionChoice(key.labels[optPos]) === null)

  // Build each named layout: shared keys + keys belonging to this choice
  const layouts: Record<string, QmkLayout> = {}
  for (let i = 0; i < numLayouts; i++) {
    const choiceKeys = annotatedKeys.filter((key) => {
      const oc = parseOptionChoice(key.labels[optPos])
      return oc !== null && oc.choice === i
    })

    const layoutKeys = [...sharedKeys, ...choiceKeys].map(reconstructQmkKey).sort(sortByMatrix)

    layouts[layoutNames[i]!] = { layout: layoutKeys }
  }

  // Build output
  const keyboardName = (meta.name as string) || undefined
  const manufacturer = (meta.author as string) || undefined

  if (storedQmk) {
    const { layouts: _storedLayouts, ...storedWithoutLayouts } = storedQmk
    void _storedLayouts
    return {
      ...storedWithoutLayouts,
      ...(keyboardName !== undefined ? { keyboard_name: keyboardName } : {}),
      ...(manufacturer !== undefined ? { manufacturer } : {}),
      layouts,
    }
  }

  return {
    ...(keyboardName !== undefined ? { keyboard_name: keyboardName } : {}),
    ...(manufacturer !== undefined ? { manufacturer } : {}),
    layouts,
  }
}
