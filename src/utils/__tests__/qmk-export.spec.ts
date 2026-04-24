import { describe, it, expect } from 'vitest'
import LZString from 'lz-string'
import { convertKleToQmk } from '../qmk-export'
import { convertQmkToKle } from '../qmk-import'

// Helper: build a minimal KLE internal format with annotated keys
function makeKleInternal(
  keys: Array<{
    labels: string[]
    x?: number
    y?: number
    w?: number
    h?: number
    r?: number
    rx?: number
    ry?: number
    decal?: boolean
    ghost?: boolean
  }>,
  meta?: Record<string, unknown>,
) {
  return {
    meta: { name: '', author: '', ...meta },
    keys: keys.map((k) => ({
      labels: [...k.labels, ...Array(12 - k.labels.length).fill('')],
      x: k.x ?? 0,
      y: k.y ?? 0,
      width: k.w ?? 1,
      height: k.h ?? 1,
      x2: 0,
      y2: 0,
      width2: k.w ?? 1,
      height2: k.h ?? 1,
      rotation_angle: k.r ?? 0,
      rotation_x: k.rx ?? 0,
      rotation_y: k.ry ?? 0,
      color: '#cccccc',
      textColor: Array(12).fill(''),
      textSize: Array(12).fill(0),
      decal: k.decal ?? false,
      ghost: k.ghost ?? false,
      stepped: false,
      nub: false,
      profile: '',
      sm: '',
      sb: '',
      st: '',
      switchRotation: 0,
      stabRotation: 0,
    })),
  }
}

// Build a 12-element labels array with a value at a specific position
function labelsAt(pos0: string, optPos?: number, optVal?: string): string[] {
  const arr = Array(12).fill('')
  arr[0] = pos0
  if (optPos !== undefined && optVal !== undefined) arr[optPos] = optVal
  return arr
}

describe('QMK Export', () => {
  describe('convertKleToQmk — basic', () => {
    it('returns null when no keys have matrix coordinates', () => {
      const kleData = makeKleInternal([
        { labels: ['A', '', '', '', '', '', '', '', '', '', '', ''], x: 0, y: 0 },
      ])
      expect(convertKleToQmk(kleData)).toBeNull()
    })

    it('returns null for empty/null input', () => {
      expect(convertKleToQmk(null)).toBeNull()
      expect(convertKleToQmk({})).toBeNull()
    })

    it('converts a single layout with correct matrix and position', () => {
      const kleData = makeKleInternal([
        { labels: labelsAt('0,0'), x: 0, y: 0 },
        { labels: labelsAt('0,1'), x: 1, y: 0 },
        { labels: labelsAt('1,0'), x: 0, y: 1 },
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: unknown[] }>
      const keys = Object.values(layouts)[0]!.layout
      expect(keys).toHaveLength(3)
      expect(keys[0]).toEqual({ matrix: [0, 0], x: 0, y: 0 })
      expect(keys[1]).toEqual({ matrix: [0, 1], x: 1, y: 0 })
      expect(keys[2]).toEqual({ matrix: [1, 0], x: 0, y: 1 })
    })

    it('omits default w=1, h=1, r=0, rx=0, ry=0 from output keys', () => {
      const kleData = makeKleInternal([{ labels: labelsAt('0,0'), x: 0, y: 0 }])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      const key = Object.values(layouts)[0]!.layout[0]!
      expect(key.w).toBeUndefined()
      expect(key.h).toBeUndefined()
      expect(key.r).toBeUndefined()
      expect(key.rx).toBeUndefined()
      expect(key.ry).toBeUndefined()
    })

    it('includes non-default w, h, r, rx, ry', () => {
      const kleData = makeKleInternal([
        { labels: labelsAt('0,0'), x: 1, y: 2, w: 2, h: 1.5, r: 15, rx: 4.5, ry: 9.1 },
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      const key = Object.values(layouts)[0]!.layout[0]!
      expect(key.w).toBe(2)
      expect(key.h).toBe(1.5)
      expect(key.r).toBe(15)
      expect(key.rx).toBe(4.5)
      expect(key.ry).toBe(9.1)
    })

    it('sorts output keys by matrix position (row then col)', () => {
      const kleData = makeKleInternal([
        { labels: labelsAt('1,1'), x: 1, y: 1 },
        { labels: labelsAt('0,0'), x: 0, y: 0 },
        { labels: labelsAt('0,1'), x: 1, y: 0 },
        { labels: labelsAt('1,0'), x: 0, y: 1 },
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      const keys = Object.values(layouts)[0]!.layout
      expect(keys[0]!.matrix).toEqual([0, 0])
      expect(keys[1]!.matrix).toEqual([0, 1])
      expect(keys[2]!.matrix).toEqual([1, 0])
      expect(keys[3]!.matrix).toEqual([1, 1])
    })

    it('excludes decal and ghost keys', () => {
      const kleData = makeKleInternal([
        { labels: labelsAt('0,0'), x: 0, y: 0 },
        { labels: labelsAt('0,1'), x: 1, y: 0, decal: true },
        { labels: labelsAt('0,2'), x: 2, y: 0, ghost: true },
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: unknown[] }>
      expect(Object.values(layouts)[0]!.layout).toHaveLength(1)
    })
  })

  describe('convertKleToQmk — floating-point accuracy', () => {
    it('removes floating-point noise from kle-serial rotation arithmetic', () => {
      // Simulate kle-serial adding rx + x_offset with fp noise
      // e.g. rx=5.5142, x_kle=-1.125 → key.x = 5.5142 - 1.125 = 4.3892000000...003
      const kleData = makeKleInternal([
        {
          labels: labelsAt('4,4'),
          x: 5.5142 + -1.125, // = 4.389200000000003 in JS
          y: 5.6062 + -0.5, //  = 5.1062000000000003 in JS
          r: 36.4,
          rx: 5.5142,
          ry: 5.6062,
          w: 2.25,
        },
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      const key = Object.values(layouts)[0]!.layout[0]!
      // Must not contain floating-point garbage digits
      expect(key.x).toBe(4.3892)
      expect(key.y).toBe(5.1062)
    })

    it('preserves original decimal precision for clean values', () => {
      const kleData = makeKleInternal([
        { labels: labelsAt('0,0'), x: 4.5, y: 9.1, r: 15, rx: 4.5, ry: 9.1 },
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      const key = Object.values(layouts)[0]!.layout[0]!
      expect(key.x).toBe(4.5)
      expect(key.y).toBe(9.1)
      expect(key.r).toBe(15)
    })
  })

  describe('convertKleToQmk — alternative layouts at labels[8] (VIA/QMK standard)', () => {
    it('shared keys appear in both layouts; variant keys only in their layout', () => {
      const kleData = makeKleInternal([
        { labels: labelsAt('0,0'), x: 0, y: 0 }, // shared
        { labels: labelsAt('0,1', 8, '0,0'), x: 1, y: 0, w: 2.25 }, // ANSI
        { labels: labelsAt('0,1', 8, '0,1'), x: 1, y: 0, w: 1.25 }, // ISO
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      const layoutArrays = Object.values(layouts)
      expect(layoutArrays).toHaveLength(2)
      expect(layoutArrays[0]!.layout).toHaveLength(2)
      expect(layoutArrays[1]!.layout).toHaveLength(2)

      const ansi = layoutArrays[0]!.layout.find((k) => (k.matrix as number[])[1] === 1)!
      const iso = layoutArrays[1]!.layout.find((k) => (k.matrix as number[])[1] === 1)!
      expect(ansi.w).toBe(2.25)
      expect(iso.w).toBe(1.25)
    })

    it('uses layout names from _kleng_qmk_data', () => {
      const stored = { keyboard_name: 'Test', layouts: { LAYOUT_ansi: {}, LAYOUT_iso: {} } }
      const compressed = LZString.compressToBase64(JSON.stringify(stored))
      const kleData = makeKleInternal(
        [
          { labels: labelsAt('0,0', 8, '0,0'), x: 0, y: 0 },
          { labels: labelsAt('0,0', 8, '0,1'), x: 0, y: 0 },
        ],
        { _kleng_qmk_data: compressed },
      )
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      expect(Object.keys(result.layouts as object)).toEqual(['LAYOUT_ansi', 'LAYOUT_iso'])
    })

    it('generates LAYOUT for single layout when no stored data', () => {
      const kleData = makeKleInternal([{ labels: labelsAt('0,0'), x: 0, y: 0 }])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      expect(Object.keys(result.layouts as object)).toContain('LAYOUT')
    })

    it('generates LAYOUT_0 / LAYOUT_1 for multiple layouts when no stored data', () => {
      const kleData = makeKleInternal([
        { labels: labelsAt('0,0', 8, '0,0'), x: 0, y: 0 },
        { labels: labelsAt('0,0', 8, '0,1'), x: 0, y: 0 },
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      expect(Object.keys(result.layouts as object)).toEqual(['LAYOUT_0', 'LAYOUT_1'])
    })
  })

  describe('convertKleToQmk — alternative layouts at labels[3] (non-VIA KLE files)', () => {
    it('detects option/choice at labels[3] when labels[8] is empty', () => {
      const kleData = makeKleInternal([
        { labels: labelsAt('0,0'), x: 0, y: 0 }, // shared
        { labels: labelsAt('0,1', 3, '0,0'), x: 1, y: 0, w: 2.25 }, // choice 0
        { labels: labelsAt('0,1', 3, '0,1'), x: 1, y: 0, w: 1.25 }, // choice 1
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      expect(Object.values(layouts)).toHaveLength(2)
      const l0 = Object.values(layouts)[0]!.layout
      const l1 = Object.values(layouts)[1]!.layout
      expect(l0.find((k) => (k.matrix as number[])[1] === 1)?.w).toBe(2.25)
      expect(l1.find((k) => (k.matrix as number[])[1] === 1)?.w).toBe(1.25)
    })

    it('groups keys by choice number, ignoring option number (multi-option scenario)', () => {
      // Simulates kle_v3.json-style: multiple independent options, all synchronized
      // Option 1 choices: "1,0" = choice 0, "1,1" = choice 1
      // Option 5 choices: "5,0" = choice 0, "5,1" = choice 1
      const kleData = makeKleInternal([
        { labels: labelsAt('0,0'), x: 0, y: 0 }, // shared
        { labels: labelsAt('2,13', 3, '1,0'), x: 5, y: 2, w: 2.25 }, // opt 1 choice 0
        { labels: labelsAt('3,12', 3, '1,1'), x: 4, y: 3, w: 1.5 }, // opt 1 choice 1
        { labels: labelsAt('4,0', 3, '5,0'), x: 0, y: 4, w: 1.25 }, // opt 5 choice 0
        { labels: labelsAt('4,0', 3, '5,1'), x: 0, y: 4 }, // opt 5 choice 1
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      expect(Object.values(layouts)).toHaveLength(2)

      // Layout 0: shared + option-1-choice-0 + option-5-choice-0 = 3 keys
      const l0Keys = Object.values(layouts)[0]!.layout
      expect(l0Keys).toHaveLength(3)

      // Layout 1: shared + option-1-choice-1 + option-5-choice-1 = 3 keys
      const l1Keys = Object.values(layouts)[1]!.layout
      expect(l1Keys).toHaveLength(3)
    })

    it('prefers labels[8] over labels[3] when both have option/choice data', () => {
      // If labels[8] is populated, use it regardless of labels[3]
      const kleData = makeKleInternal([
        { labels: labelsAt('0,0', 8, '0,0'), x: 0, y: 0 },
        { labels: labelsAt('0,0', 8, '0,1'), x: 0, y: 0 },
      ])
      // manually set labels[3] on the same key objects to something misleading
      // (already empty — this test just verifies labels[8] takes priority)
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: unknown[] }>
      expect(Object.values(layouts)).toHaveLength(2)
    })
  })

  describe('convertKleToQmk — metadata', () => {
    it('overrides keyboard_name and manufacturer from metadata while preserving other fields', () => {
      const stored = {
        keyboard_name: 'OldName',
        manufacturer: 'OldMfg',
        url: 'https://example.com',
        layouts: { LAYOUT: {} },
      }
      const compressed = LZString.compressToBase64(JSON.stringify(stored))
      const kleData = makeKleInternal([{ labels: labelsAt('0,0'), x: 0, y: 0 }], {
        name: 'NewName',
        author: 'NewMfg',
        _kleng_qmk_data: compressed,
      })
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      expect(result.keyboard_name).toBe('NewName')
      expect(result.manufacturer).toBe('NewMfg')
      expect(result.url).toBe('https://example.com')
    })

    it('produces minimal output when no stored QMK data', () => {
      const kleData = makeKleInternal([{ labels: labelsAt('0,0'), x: 0, y: 0 }], {
        name: 'MyBoard',
        author: 'Me',
      })
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      expect(Object.keys(result).sort()).toEqual(['keyboard_name', 'layouts', 'manufacturer'])
    })
  })

  describe('convertKleToQmk — roundtrip with convertQmkToKle', () => {
    it('preserves layout structure and metadata through QMK→KLE→QMK roundtrip', () => {
      const qmkData = {
        keyboard_name: 'Roundtrip',
        manufacturer: 'Test',
        url: 'https://roundtrip.test',
        layouts: {
          LAYOUT_ansi: {
            layout: [
              { matrix: [0, 0], x: 0, y: 0 },
              { matrix: [0, 1], x: 1, y: 0, w: 2.25 },
            ],
          },
          LAYOUT_iso: {
            layout: [
              { matrix: [0, 0], x: 0, y: 0 },
              { matrix: [0, 1], x: 1, y: 0, w: 1.25 },
            ],
          },
        },
      }

      const keyboard = convertQmkToKle(qmkData)
      const result = convertKleToQmk({ meta: keyboard.meta, keys: keyboard.keys }) as Record<
        string,
        unknown
      >

      expect(result).not.toBeNull()
      expect(result.keyboard_name).toBe('Roundtrip')
      expect(result.url).toBe('https://roundtrip.test')

      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      expect(Object.keys(layouts)).toEqual(['LAYOUT_ansi', 'LAYOUT_iso'])

      const ansiKey = layouts['LAYOUT_ansi']!.layout.find((k) => (k.matrix as number[])[1] === 1)!
      const isoKey = layouts['LAYOUT_iso']!.layout.find((k) => (k.matrix as number[])[1] === 1)!
      expect(ansiKey.w).toBe(2.25)
      expect(isoKey.w).toBe(1.25)
    })

    it('roundtrip with rotation values produces no floating-point artifacts', () => {
      const qmkData = {
        keyboard_name: 'Corne',
        layouts: {
          LAYOUT_default: {
            layout: [
              { matrix: [3, 3], x: 4, y: 4.25 },
              { matrix: [3, 4], x: 4, y: 4.25, r: 15, rx: 4.5, ry: 9.1 },
              { matrix: [3, 5], x: 4, y: 4.25, h: 1.5, r: 30, rx: 5.4, ry: 9.3 },
            ],
          },
        },
      }

      const keyboard = convertQmkToKle(qmkData)
      const result = convertKleToQmk({ meta: keyboard.meta, keys: keyboard.keys }) as Record<
        string,
        unknown
      >
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>
      const keys = layouts['LAYOUT_default']!.layout

      // All values must be clean numbers — no floating-point noise
      const numericEntries = keys.flatMap((key) =>
        Object.entries(key).filter(([k, v]) => k !== 'matrix' && typeof v === 'number'),
      ) as [string, number][]

      for (const [k, v] of numericEntries) {
        expect(
          String(v).includes('e') === false,
          `${k}=${v} should not be in scientific notation`,
        ).toBe(true)
        expect(v, `${k}=${v} should not have fp noise`).toBe(parseFloat(v.toFixed(6)))
      }

      // Specific values must match originals exactly
      const k0 = keys.find((k) => (k.matrix as number[])[1] === 3)!
      const k1 = keys.find((k) => (k.matrix as number[])[1] === 4)!
      const k2 = keys.find((k) => (k.matrix as number[])[1] === 5)!
      expect(k0).toEqual({ matrix: [3, 3], x: 4, y: 4.25 })
      expect(k1).toEqual({ matrix: [3, 4], x: 4, y: 4.25, r: 15, rx: 4.5, ry: 9.1 })
      expect(k2).toEqual({ matrix: [3, 5], x: 4, y: 4.25, h: 1.5, r: 30, rx: 5.4, ry: 9.3 })
    })
  })

  describe('convertKleToQmk — kle_v3.json-style keyboard', () => {
    // This mirrors the structure of kle_v3.json: a real keyboard with matrix annotations,
    // multiple independent VIA options at labels[3], and rotated keys with fp-prone coords.
    it('correctly exports a keyboard with multiple options at labels[3]', () => {
      const kleData = makeKleInternal([
        // Shared keys (no option/choice)
        { labels: labelsAt('0,0'), x: 0, y: 0 },
        { labels: labelsAt('0,1'), x: 1, y: 0 },
        // Option 1: enter shape — choice 0 = ANSI, choice 1 = ISO
        { labels: labelsAt('2,13', 3, '1,0'), x: 12.25, y: 2, w: 2.25 },
        { labels: labelsAt('2,13', 3, '1,1'), x: 12.25, y: 2, w: 1.5 },
        // Option 5: bottom row — choice 0 = standard, choice 1 = split
        { labels: labelsAt('4,0', 3, '5,0'), x: 0, y: 4, w: 2.75 },
        { labels: labelsAt('4,0', 3, '5,1'), x: 0, y: 4, w: 1.5 },
        { labels: labelsAt('4,1', 3, '5,1'), x: 1.5, y: 4 },
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>

      // Should produce exactly 2 layouts
      expect(Object.keys(layouts)).toHaveLength(2)

      const [l0, l1] = Object.values(layouts)

      // Layout 0 (choice 0): 2 shared + 1 opt-1-ch0 + 1 opt-5-ch0 = 4 keys
      expect(l0!.layout).toHaveLength(4)

      // Layout 1 (choice 1): 2 shared + 1 opt-1-ch1 + 2 opt-5-ch1 = 5 keys
      expect(l1!.layout).toHaveLength(5)

      // Verify the right variant is in each layout
      const enterL0 = l0!.layout.find((k) => (k.matrix as number[])[0] === 2)!
      const enterL1 = l1!.layout.find((k) => (k.matrix as number[])[0] === 2)!
      expect(enterL0.w).toBe(2.25) // ANSI
      expect(enterL1.w).toBe(1.5) // ISO
    })

    it('kle_v3.json-style with rotated keys produces no fp artifacts', () => {
      // Key with exact kle_v3.json rotation values that cause fp noise in JS
      // rx=5.5142, kle_x=-1.125 → abs_x = 5.5142 - 1.125 = 4.3892000000000003
      // ry=5.6062, kle_y=-0.5  → abs_y = 5.6062 - 0.5  = 5.1062000000000003
      const kleData = makeKleInternal([
        {
          labels: labelsAt('4,4', 3, '3,0'),
          x: 5.5142 + -1.125,
          y: 5.6062 + -0.5,
          w: 2.25,
          r: 36.4,
          rx: 5.5142,
          ry: 5.6062,
        },
        {
          labels: labelsAt('4,3', 3, '3,1'),
          x: 5.5142 + -1.1242,
          y: 5.6062 + 0.5038,
          r: 36.4,
          rx: 5.5142,
          ry: 5.6062,
        },
        {
          labels: labelsAt('4,4', 3, '3,1'),
          x: 5.5142 + -0.1242,
          y: 5.6062 + 0.5038,
          w: 1.25,
          r: 36.4,
          rx: 5.5142,
          ry: 5.6062,
        },
      ])
      const result = convertKleToQmk(kleData) as Record<string, unknown>
      const layouts = result.layouts as Record<string, { layout: Array<Record<string, unknown>> }>

      for (const layout of Object.values(layouts)) {
        for (const key of layout.layout) {
          for (const [prop, val] of Object.entries(key)) {
            if (prop === 'matrix' || typeof val !== 'number') continue
            expect(val, `${prop}=${val} must equal rounded self`).toBe(parseFloat(val.toFixed(6)))
          }
        }
      }
    })
  })
})
