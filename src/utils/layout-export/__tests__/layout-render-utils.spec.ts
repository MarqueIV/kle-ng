import { describe, it, expect } from 'vitest'
import { Key, KeyboardMetadata, type Array12 } from '@adamws/kle-serial'
import {
  escapeHtml,
  sanitizeLabelForHtml,
  getLabelAtIndex,
  normalizeLayoutInput,
  DEFAULT_UNIT,
} from '../layout-render-utils'

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s')
  })

  it('returns unchanged string when nothing to escape', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('sanitizeLabelForHtml', () => {
  it('replaces backticks with HTML entity', () => {
    expect(sanitizeLabelForHtml('`key`')).toBe('&#96;key&#96;')
  })

  it('escapes </script closing tags', () => {
    expect(sanitizeLabelForHtml('</script>')).toBe('<\\/script>')
  })

  it('is case-insensitive for </script', () => {
    // The regex matches case-insensitively but replacement is lowercase
    expect(sanitizeLabelForHtml('</SCRIPT>')).toBe('<\\/script>')
  })

  it('leaves normal text unchanged', () => {
    expect(sanitizeLabelForHtml('Enter')).toBe('Enter')
  })
})

const makeLabels = (...vals: (string | null)[]): Array12<string> => {
  const arr: (string | null)[] = [...vals, ...Array(12 - vals.length).fill(null)]
  return arr as unknown as Array12<string>
}

describe('getLabelAtIndex', () => {
  const makeKey = (labels: Array12<string>): Key => {
    const key = new Key()
    key.labels = labels
    return key
  }

  it('returns top-left label at index 0', () => {
    const key = makeKey(makeLabels('A'))
    expect(getLabelAtIndex(key, 0)).toBe('A')
  })

  it('returns bottom-left label at index 6', () => {
    const key = makeKey(makeLabels(null, null, null, null, null, null, 'fn'))
    expect(getLabelAtIndex(key, 6)).toBe('fn')
  })

  it('returns empty string for null label', () => {
    const key = makeKey(makeLabels())
    expect(getLabelAtIndex(key, 0)).toBe('')
  })

  it('returns empty string for whitespace-only label', () => {
    const key = makeKey(makeLabels('   '))
    expect(getLabelAtIndex(key, 0)).toBe('')
  })

  it('sanitizes backticks in labels', () => {
    const key = makeKey(makeLabels('`A`'))
    expect(getLabelAtIndex(key, 0)).toBe('&#96;A&#96;')
  })

  it('returns empty string when key has no labels', () => {
    const key = new Key()
    key.labels = makeLabels()
    expect(getLabelAtIndex(key, 0)).toBe('')
  })
})

describe('normalizeLayoutInput', () => {
  const makeKey = (x: number, y: number, w = 1, h = 1, topLabel = '', bottomLabel = ''): Key => {
    const key = new Key()
    key.x = x
    key.y = y
    key.width = w
    key.height = h
    const labels = makeLabels(topLabel || null, null, null, null, null, null, bottomLabel || null)
    key.labels = labels
    return key
  }

  const makeMetadata = (overrides: Partial<KeyboardMetadata> = {}): KeyboardMetadata => {
    const meta = new KeyboardMetadata()
    Object.assign(meta, overrides)
    return meta
  }

  it('computes boardWidth and boardHeight from key extents', () => {
    const keys = [makeKey(0, 0, 1, 1), makeKey(1, 0, 1, 1), makeKey(2, 0, 1, 1)]
    const meta = makeMetadata()
    const result = normalizeLayoutInput(keys, meta, 'test')

    expect(result.boardWidth).toBe(3 * DEFAULT_UNIT)
    expect(result.boardHeight).toBe(1 * DEFAULT_UNIT)
  })

  it('offsets keys relative to minimum x/y', () => {
    const keys = [makeKey(1, 2, 1, 1)]
    const meta = makeMetadata()
    const result = normalizeLayoutInput(keys, meta, 'test')

    expect(result.keys[0]!.left).toBe(0)
    expect(result.keys[0]!.top).toBe(0)
  })

  it('respects custom unit size', () => {
    const keys = [makeKey(0, 0, 2, 1)]
    const meta = makeMetadata()
    const unit = 100
    const result = normalizeLayoutInput(keys, meta, 'test', unit)

    expect(result.keys[0]!.width).toBe(200)
    expect(result.boardWidth).toBe(200)
  })

  it('uses metadata.name as layoutName when available', () => {
    const keys = [makeKey(0, 0)]
    const meta = makeMetadata({ name: 'My Board' })
    const result = normalizeLayoutInput(keys, meta, 'filename')
    expect(result.layoutName).toBe('My Board')
  })

  it('falls back to filename when metadata.name is empty', () => {
    const keys = [makeKey(0, 0)]
    const meta = makeMetadata({ name: '' })
    const result = normalizeLayoutInput(keys, meta, 'my-file')
    expect(result.layoutName).toBe('my-file')
  })

  it('uses metadata.backcolor for backColor', () => {
    const keys = [makeKey(0, 0)]
    const meta = makeMetadata({ backcolor: '#abcdef' })
    const result = normalizeLayoutInput(keys, meta, 'test')
    expect(result.backColor).toBe('#abcdef')
  })

  it('defaults backColor to #ffffff when backcolor is empty', () => {
    const keys = [makeKey(0, 0)]
    const meta = makeMetadata({ backcolor: '' })
    const result = normalizeLayoutInput(keys, meta, 'test')
    expect(result.backColor).toBe('#ffffff')
  })

  it('uses metadata.radii trimmed for radiiValue', () => {
    const keys = [makeKey(0, 0)]
    const meta = makeMetadata({ radii: '  10px  ' })
    const result = normalizeLayoutInput(keys, meta, 'test')
    expect(result.radiiValue).toBe('10px')
  })

  it('defaults radiiValue to 6px when radii is empty', () => {
    const keys = [makeKey(0, 0)]
    const meta = makeMetadata({ radii: '' })
    const result = normalizeLayoutInput(keys, meta, 'test')
    expect(result.radiiValue).toBe('6px')
  })

  it('extracts top-left (index 0) and bottom-left (index 6) labels', () => {
    const keys = [makeKey(0, 0, 1, 1, 'Ctrl', 'fn')]
    const meta = makeMetadata()
    const result = normalizeLayoutInput(keys, meta, 'test')
    expect(result.keys[0]!.topLeftLabel).toBe('Ctrl')
    expect(result.keys[0]!.bottomLeftLabel).toBe('fn')
  })

  it('handles multiple keys with correct positions', () => {
    const keys = [makeKey(0, 0), makeKey(1, 0), makeKey(0, 1)]
    const meta = makeMetadata()
    const result = normalizeLayoutInput(keys, meta, 'test')

    expect(result.keys[0]).toMatchObject({ left: 0, top: 0 })
    expect(result.keys[1]).toMatchObject({ left: DEFAULT_UNIT, top: 0 })
    expect(result.keys[2]).toMatchObject({ left: 0, top: DEFAULT_UNIT })
  })
})
