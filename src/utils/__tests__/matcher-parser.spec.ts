import { describe, it, expect } from 'vitest'
import { Key } from '@adamws/kle-serial'
import { compileMatchers, validateMatchers } from '../matcher-parser'

function makeKey(overrides: Partial<Key> = {}): Key {
  const key = new Key()
  return Object.assign(key, overrides)
}

// ---------------------------------------------------------------------------
// Numeric comparisons
// ---------------------------------------------------------------------------

describe('numeric comparisons', () => {
  it('width >', () => {
    const wide = makeKey({ width: 2 })
    const normal = makeKey({ width: 1 })
    const match = compileMatchers('width > 1')
    expect(match(wide)).toBe(true)
    expect(match(normal)).toBe(false)
  })

  it('width >=', () => {
    const match = compileMatchers('width >= 1.5')
    expect(match(makeKey({ width: 2.25 }))).toBe(true)
    expect(match(makeKey({ width: 1.5 }))).toBe(true)
    expect(match(makeKey({ width: 1 }))).toBe(false)
  })

  it('height == (double-equals)', () => {
    const match = compileMatchers('height == 1')
    expect(match(makeKey({ height: 1 }))).toBe(true)
    expect(match(makeKey({ height: 2 }))).toBe(false)
  })

  it('height = (single-equals alias)', () => {
    const match = compileMatchers('height = 1')
    expect(match(makeKey({ height: 1 }))).toBe(true)
    expect(match(makeKey({ height: 2 }))).toBe(false)
  })

  it('height <=', () => {
    const match = compileMatchers('height <= 1')
    expect(match(makeKey({ height: 1 }))).toBe(true)
    expect(match(makeKey({ height: 0.5 }))).toBe(true)
    expect(match(makeKey({ height: 2 }))).toBe(false)
  })

  it('rotation != 0', () => {
    const match = compileMatchers('rotation != 0')
    expect(match(makeKey({ rotation_angle: 15 }))).toBe(true)
    expect(match(makeKey({ rotation_angle: 0 }))).toBe(false)
  })

  it('x and y', () => {
    const key = makeKey({ x: 5, y: 3 })
    expect(compileMatchers('x >= 5')(key)).toBe(true)
    expect(compileMatchers('x > 5')(key)).toBe(false)
    expect(compileMatchers('y < 4')(key)).toBe(true)
    expect(compileMatchers('y < 3')(key)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Boolean flags
// ---------------------------------------------------------------------------

describe('boolean flags', () => {
  it('decal', () => {
    const match = compileMatchers('decal')
    expect(match(makeKey({ decal: true }))).toBe(true)
    expect(match(makeKey({ decal: false }))).toBe(false)
  })

  it('ghost', () => {
    const match = compileMatchers('ghost')
    expect(match(makeKey({ ghost: true }))).toBe(true)
    expect(match(makeKey({ ghost: false }))).toBe(false)
  })

  it('stepped', () => {
    const match = compileMatchers('stepped')
    expect(match(makeKey({ stepped: true }))).toBe(true)
    expect(match(makeKey({ stepped: false }))).toBe(false)
  })

  it('nub', () => {
    const match = compileMatchers('nub')
    expect(match(makeKey({ nub: true }))).toBe(true)
    expect(match(makeKey({ nub: false }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Label checks
// ---------------------------------------------------------------------------

describe('label checks', () => {
  function keyWithLabel(label: string, position = 0): Key {
    const key = new Key()
    key.labels[position] = label
    return key
  }

  describe('eq (==)', () => {
    it('matches any position', () => {
      const match = compileMatchers('label == "Esc"')
      expect(match(keyWithLabel('Esc', 0))).toBe(true)
      expect(match(keyWithLabel('Esc', 5))).toBe(true)
      expect(match(keyWithLabel('Enter', 0))).toBe(false)
    })

    it('matches specific position with label[n]', () => {
      const matchPos0 = compileMatchers('label[0] == "Enter"')
      expect(matchPos0(keyWithLabel('Enter', 0))).toBe(true)
      expect(matchPos0(keyWithLabel('Enter', 1))).toBe(false)
    })
  })

  describe('neq (!=)', () => {
    it('matches only when no position equals the value', () => {
      const match = compileMatchers('label != "Esc"')
      // key has Esc at position 0 — should NOT match
      expect(match(keyWithLabel('Esc', 0))).toBe(false)
      // key has Enter, no Esc anywhere — should match
      expect(match(keyWithLabel('Enter', 0))).toBe(true)
    })

    it('empty-label key does not have Esc — should match', () => {
      const match = compileMatchers('label != "Esc"')
      expect(match(new Key())).toBe(true)
    })

    it('label[n] != checks only that position', () => {
      const match = compileMatchers('label[0] != "Esc"')
      const key = keyWithLabel('Esc', 0)
      key.labels[1] = 'Other'
      expect(match(key)).toBe(false)
      expect(match(keyWithLabel('Enter', 0))).toBe(true)
    })
  })

  describe('contains', () => {
    it('matches any position that contains the substring', () => {
      const match = compileMatchers('label contains "Shift"')
      expect(match(keyWithLabel('Left Shift', 0))).toBe(true)
      expect(match(keyWithLabel('Right Shift', 2))).toBe(true)
      expect(match(keyWithLabel('Ctrl', 0))).toBe(false)
    })
  })

  describe('matches (regex)', () => {
    it('matches label against a regular expression', () => {
      const match = compileMatchers('label matches "^F[0-9]+$"')
      expect(match(keyWithLabel('F1'))).toBe(true)
      expect(match(keyWithLabel('F12'))).toBe(true)
      expect(match(keyWithLabel('Esc'))).toBe(false)
    })

    it('regex matches any position when no index given', () => {
      const match = compileMatchers('label matches "([Ee]nter|[Ee]sc.*)"')
      expect(match(keyWithLabel('Enter', 0))).toBe(true)
      expect(match(keyWithLabel('Esc', 3))).toBe(true)
      expect(match(keyWithLabel('Space', 0))).toBe(false)
    })

    it('2.25x1 Enter key — the reported failing case', () => {
      const key = makeKey({ width: 2.25, height: 1 })
      key.labels[0] = 'Enter'
      const match = compileMatchers('label matches "([Ee]nter|[Ee]sc.*)" and height == 1')
      expect(match(key)).toBe(true)
    })

    it('throws at compile time for an invalid regex', () => {
      // Extra closing paren makes the regex invalid — previously silently returned false
      expect(() => compileMatchers('label matches "([Ee]nter|[Ee]sc.*))"')).toThrow(
        /Invalid regular expression/,
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Logic operators
// ---------------------------------------------------------------------------

describe('logic operators', () => {
  it('and — both conditions must hold', () => {
    const match = compileMatchers('width >= 2 and height == 1')
    expect(match(makeKey({ width: 2.25, height: 1 }))).toBe(true)
    expect(match(makeKey({ width: 2.25, height: 2 }))).toBe(false)
    expect(match(makeKey({ width: 1, height: 1 }))).toBe(false)
  })

  it('or — either condition is sufficient', () => {
    const match = compileMatchers('ghost or decal')
    expect(match(makeKey({ ghost: true }))).toBe(true)
    expect(match(makeKey({ decal: true }))).toBe(true)
    expect(match(makeKey({ ghost: false, decal: false }))).toBe(false)
  })

  it('not', () => {
    const match = compileMatchers('not decal')
    expect(match(makeKey({ decal: false }))).toBe(true)
    expect(match(makeKey({ decal: true }))).toBe(false)
  })

  it('not with parentheses', () => {
    const match = compileMatchers('not (ghost or decal)')
    expect(match(makeKey({ ghost: false, decal: false }))).toBe(true)
    expect(match(makeKey({ ghost: true, decal: false }))).toBe(false)
    expect(match(makeKey({ ghost: false, decal: true }))).toBe(false)
  })

  it('operator precedence: and binds tighter than or', () => {
    // Parsed as: (width > 1) or (height == 1 and decal)
    const match = compileMatchers('width > 1 or height == 1 and decal')
    expect(match(makeKey({ width: 2 }))).toBe(true)
    expect(match(makeKey({ height: 1, decal: true }))).toBe(true)
    expect(match(makeKey({ height: 1, decal: false }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validateMatchers
// ---------------------------------------------------------------------------

describe('validateMatchers', () => {
  it('returns null for valid expressions', () => {
    expect(validateMatchers('width >= 1.5')).toBeNull()
    expect(validateMatchers('label == "Esc"')).toBeNull()
    expect(validateMatchers('ghost or decal')).toBeNull()
    expect(validateMatchers('not (ghost or decal)')).toBeNull()
  })

  it('returns an error string for unknown identifiers', () => {
    expect(validateMatchers('colour == "red"')).toMatch(/Unknown identifier/)
  })

  it('returns an error string for unterminated strings', () => {
    expect(validateMatchers('label == "Esc')).toMatch(/Unterminated string/)
  })

  it('returns an error string for invalid regex', () => {
    expect(validateMatchers('label matches "([Ee]nter|[Ee]sc.*))"')).toMatch(
      /Invalid regular expression/,
    )
  })

  it('returns an error string for missing operator', () => {
    expect(validateMatchers('width')).toMatch(/Expected/)
  })
})

// ---------------------------------------------------------------------------
// Builtin theme matchers — compile-time smoke tests
// ---------------------------------------------------------------------------

describe('builtin theme matchers compile without error', () => {
  it('all builtin matchers parse without throwing', () => {
    const matchers = [
      'width > 1 or height > 1 or label matches "([Cc]trl|[Cc]ontrol|[Aa]lt.*|[Ww]in.*|[Mm]enu|[Ff]n)"',
      'label matches "([Ee]nter|[Ee]sc.*)" and height == 1',
      'width >= 4',
      'label matches "([Ee]nter|[Cc]aps.*)"',
      'label matches "([Ee]sc.*|[Ss]hift)"',
      'label matches "([Tt]ab.*|[Bb]ack.*)"',
      'label matches "([Cc]trl|[Cc]ontrol|[Aa]lt.*|[Ww]in.*|[Mm]enu|[Ff]n)"',
      'decal',
      'label matches "([Ee]nter|[Ee]sc.*)" and height <= 1',
    ]
    for (const matcher of matchers) {
      expect(() => compileMatchers(matcher)).not.toThrow()
    }
  })

  it('VIA Accents: 1x1 Esc gets accent color', () => {
    const match = compileMatchers('label matches "([Ee]nter|[Ee]sc.*)" and height == 1')
    const esc = makeKey({ width: 1, height: 1 })
    esc.labels[0] = 'Esc'
    expect(match(esc)).toBe(true)
  })

  it('VIA Accents: 2.25x1 ANSI Enter gets accent color', () => {
    const match = compileMatchers('label matches "([Ee]nter|[Ee]sc.*)" and height == 1')
    const enter = makeKey({ width: 2.25, height: 1 })
    enter.labels[0] = 'Enter'
    expect(match(enter)).toBe(true)
  })

  it('VIA Accents: ISO Enter (height=2) does not get accent color', () => {
    const match = compileMatchers('label matches "([Ee]nter|[Ee]sc.*)" and height == 1')
    const isoEnter = makeKey({ width: 1.5, height: 2 })
    isoEnter.labels[0] = 'Enter'
    expect(match(isoEnter)).toBe(false)
  })

  it('VIA Modifiers: 1.25x1 Tab is a modifier', () => {
    const match = compileMatchers('width > 1 or height > 1')
    expect(match(makeKey({ width: 1.25, height: 1 }))).toBe(true)
  })

  it('VIA Modifiers: 1x1 alpha is not a modifier', () => {
    const match = compileMatchers('width > 1 or height > 1')
    expect(match(makeKey({ width: 1, height: 1 }))).toBe(false)
  })
})
