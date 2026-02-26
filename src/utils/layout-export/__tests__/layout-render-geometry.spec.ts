import { describe, it, expect } from 'vitest'
import {
  computeInnerRect,
  computeNubPosition,
  computeMultiLineStartY,
} from '../layout-render-geometry'

describe('computeInnerRect', () => {
  it('returns correct inner rect for a standard 1u key at origin', () => {
    expect(computeInnerRect(0, 0, 54, 54)).toEqual({ x: 6, y: 3, w: 42, h: 42 })
  })

  it('returns correct inner rect for a wide key', () => {
    expect(computeInnerRect(0, 0, 108, 54)).toEqual({ x: 6, y: 3, w: 96, h: 42 })
  })

  it('applies left/top offsets correctly at non-zero origin', () => {
    const result = computeInnerRect(100, 200, 54, 54)
    expect(result).toEqual({ x: 106, y: 203, w: 42, h: 42 })
  })

  it('width and height reduction is always 12', () => {
    const result = computeInnerRect(0, 0, 72, 72)
    expect(result.w).toBe(60)
    expect(result.h).toBe(60)
  })
})

describe('computeNubPosition', () => {
  it('returns correct nub position for a standard 1u key at origin', () => {
    // inner = {x:6, y:3, w:42, h:42}
    // nubX = 6 + (42 - 10) / 2 = 6 + 16 = 22
    // nubY = 3 + 42 * 0.9 - 1 = 3 + 37.8 - 1 = 39.8
    const result = computeNubPosition(0, 0, 54, 54)
    expect(result.x).toBe(22)
    expect(result.y).toBeCloseTo(39.8)
  })

  it('shifts with non-zero origin', () => {
    const atOrigin = computeNubPosition(0, 0, 54, 54)
    const offset = computeNubPosition(10, 20, 54, 54)
    expect(offset.x).toBe(atOrigin.x + 10)
    expect(offset.y).toBeCloseTo(atOrigin.y + 20)
  })

  it('HTML usage: (0, 0, w, h) produces element-relative coords with x >= 0', () => {
    const result = computeNubPosition(0, 0, 54, 54)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
  })
})

describe('computeMultiLineStartY', () => {
  it('hanging baseline returns anchorY unchanged', () => {
    expect(computeMultiLineStartY('hanging', 50, 3, 12)).toBe(50)
  })

  it('hanging baseline is unaffected by line count', () => {
    expect(computeMultiLineStartY('hanging', 50, 1, 12)).toBe(50)
    expect(computeMultiLineStartY('hanging', 50, 5, 12)).toBe(50)
  })

  it('middle baseline shifts up by (n-1)*lineHeight/2', () => {
    // 3 lines, lineHeight=12 → shift = (3-1)*12/2 = 12
    expect(computeMultiLineStartY('middle', 50, 3, 12)).toBe(38)
  })

  it('middle baseline: single line returns anchorY', () => {
    expect(computeMultiLineStartY('middle', 50, 1, 12)).toBe(50)
  })

  it('alphabetic baseline shifts up by (n-1)*lineHeight', () => {
    // 3 lines, lineHeight=12 → shift = (3-1)*12 = 24
    expect(computeMultiLineStartY('alphabetic', 50, 3, 12)).toBe(26)
  })

  it('alphabetic baseline: single line returns anchorY', () => {
    expect(computeMultiLineStartY('alphabetic', 50, 1, 12)).toBe(50)
  })
})
