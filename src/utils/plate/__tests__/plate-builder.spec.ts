import { describe, it, expect } from 'vitest'
import { Key } from '@adamws/kle-serial'
import DxfParser from 'dxf-json'
import type { PolylineEntity } from 'dxf-json'
import { buildPlate, type PlateBuilderOptions } from '../plate-builder'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createKey(overrides: Partial<Key> = {}): Key {
  const key = new Key()
  return Object.assign(key, overrides)
}

function parseDxfPolylines(dxfContent: string): { x: number; y: number }[][] {
  const parser = new DxfParser()
  const parsed = parser.parseSync(dxfContent)
  return parsed.entities
    .filter((e): e is PolylineEntity => e.type === 'POLYLINE')
    .map((poly) => poly.vertices.map((v) => ({ x: v.x, y: v.y })))
}

function polylineBounds(vertices: { x: number; y: number }[]) {
  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

function polylineCenter(vertices: { x: number; y: number }[]) {
  const b = polylineBounds(vertices)
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
}

function distanceBetweenCenters(
  poly1: { x: number; y: number }[],
  poly2: { x: number; y: number }[],
): number {
  const c1 = polylineCenter(poly1)
  const c2 = polylineCenter(poly2)
  return Math.sqrt((c2.x - c1.x) ** 2 + (c2.y - c1.y) ** 2)
}

function polylineDimensions(vertices: { x: number; y: number }[]) {
  const b = polylineBounds(vertices)
  return { width: b.maxX - b.minX, height: b.maxY - b.minY }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Plate Builder – DXF switch cutouts', () => {
  // Test 1
  it('single 1U Cherry MX key – 14x14mm centered at origin', async () => {
    const keys = [createKey({ x: 0, y: 0, width: 1, height: 1 })]
    const options: PlateBuilderOptions = { cutoutType: 'cherry-mx-basic' }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(1)
    expect(polylines[0]).toHaveLength(4)

    const dims = polylineDimensions(polylines[0]!)
    expect(dims.width).toBe(14)
    expect(dims.height).toBe(14)

    const center = polylineCenter(polylines[0]!)
    expect(center.x).toBe(0)
    expect(center.y).toBe(0)

    const b = polylineBounds(polylines[0]!)
    expect(b.minX).toBe(-7)
    expect(b.maxX).toBe(7)
    expect(b.minY).toBe(-7)
    expect(b.maxY).toBe(7)
  })

  // Test 2
  it('single 1U Alps SKCM key – 15.5x12.8mm', async () => {
    const keys = [createKey({ x: 0, y: 0, width: 1, height: 1 })]
    const options: PlateBuilderOptions = { cutoutType: 'alps-skcm' }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(1)
    expect(polylines[0]).toHaveLength(4)

    const dims = polylineDimensions(polylines[0]!)
    expect(dims.width).toBe(15.5)
    expect(dims.height).toBe(12.8)

    const b = polylineBounds(polylines[0]!)
    expect(b.minX).toBe(-7.75)
    expect(b.maxX).toBe(7.75)
    expect(b.minY).toBe(-6.4)
    expect(b.maxY).toBe(6.4)
  })

  // Test 3
  it('two 1U keys side by side – default 19.05mm spacing', async () => {
    const keys = [
      createKey({ x: 0, y: 0, width: 1, height: 1 }),
      createKey({ x: 1, y: 0, width: 1, height: 1 }),
    ]
    const options: PlateBuilderOptions = { cutoutType: 'cherry-mx-basic' }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(2)

    polylines.forEach((poly) => {
      const dims = polylineDimensions(poly)
      expect(dims.width).toBe(14)
      expect(dims.height).toBe(14)
    })

    const c0 = polylineCenter(polylines[0]!)
    expect(c0.x).toBe(0)
    expect(c0.y).toBe(0)

    const c1 = polylineCenter(polylines[1]!)
    expect(c1.x).toBe(19.05)
    expect(c1.y).toBe(0)

    expect(distanceBetweenCenters(polylines[0]!, polylines[1]!)).toBe(19.05)
  })

  // Test 4
  it('two 1U keys side by side – custom spacing 18x17mm', async () => {
    const keys = [
      createKey({ x: 0, y: 0, width: 1, height: 1 }),
      createKey({ x: 1, y: 0, width: 1, height: 1 }),
    ]
    const options: PlateBuilderOptions = {
      cutoutType: 'cherry-mx-basic',
      spacingX: 18,
      spacingY: 17,
    }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    const c0 = polylineCenter(polylines[0]!)
    expect(c0.x).toBe(0)
    expect(c0.y).toBe(0)

    const c1 = polylineCenter(polylines[1]!)
    expect(c1.x).toBe(18)
    expect(c1.y).toBe(0)

    expect(distanceBetweenCenters(polylines[0]!, polylines[1]!)).toBe(18)
  })

  // Test 5
  it('two 1U keys vertically stacked – default spacing, Y inverted', async () => {
    const keys = [
      createKey({ x: 0, y: 0, width: 1, height: 1 }),
      createKey({ x: 0, y: 1, width: 1, height: 1 }),
    ]
    const options: PlateBuilderOptions = { cutoutType: 'cherry-mx-basic' }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(2)

    const c0 = polylineCenter(polylines[0]!)
    expect(c0.x).toBe(0)
    expect(c0.y).toBe(0)

    const c1 = polylineCenter(polylines[1]!)
    expect(c1.x).toBe(0)
    expect(c1.y).toBe(-19.05) // Y inverted in maker.js

    expect(distanceBetweenCenters(polylines[0]!, polylines[1]!)).toBe(19.05)
  })

  // Test 6
  it('two 1U keys vertically – custom spacing 18x17mm', async () => {
    const keys = [
      createKey({ x: 0, y: 0, width: 1, height: 1 }),
      createKey({ x: 0, y: 1, width: 1, height: 1 }),
    ]
    const options: PlateBuilderOptions = {
      cutoutType: 'cherry-mx-basic',
      spacingX: 18,
      spacingY: 17,
    }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    const c1 = polylineCenter(polylines[1]!)
    expect(c1.x).toBe(0)
    expect(c1.y).toBe(-17)

    expect(distanceBetweenCenters(polylines[0]!, polylines[1]!)).toBe(17)
  })

  // Test 7 — rotation involves trig, use toBeCloseTo
  it('single key rotated 90° – still 14x14mm (square)', async () => {
    const keys = [
      createKey({
        x: 1,
        y: 0,
        width: 1,
        height: 1,
        rotation_angle: 90,
        rotation_x: 0,
        rotation_y: 0,
      }),
    ]
    const options: PlateBuilderOptions = { cutoutType: 'cherry-mx-basic' }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(1)
    expect(polylines[0]).toHaveLength(4)

    // Square cutout, so dimensions unchanged after rotation
    const dims = polylineDimensions(polylines[0]!)
    expect(dims.width).toBeCloseTo(14, 6)
    expect(dims.height).toBeCloseTo(14, 6)
  })

  // Test 8 — rotation involves trig, use toBeCloseTo
  it('single key rotated 45° – bounding box is ~19.8x19.8mm diamond', async () => {
    const keys = [
      createKey({
        x: 1,
        y: 0,
        width: 1,
        height: 1,
        rotation_angle: 45,
        rotation_x: 0,
        rotation_y: 0,
      }),
    ]
    const options: PlateBuilderOptions = { cutoutType: 'cherry-mx-basic' }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(1)
    expect(polylines[0]).toHaveLength(4)

    // 14mm square rotated 45° -> bounding box = 14*sqrt(2) ≈ 19.80mm
    const dims = polylineDimensions(polylines[0]!)
    expect(dims.width).toBeCloseTo(14 * Math.SQRT2, 6)
    expect(dims.height).toBeCloseTo(14 * Math.SQRT2, 6)
  })

  // Test 9 — rotation involves trig, use toBeCloseTo
  it('rotated key with non-square Alps SKCM cutout – dimensions swap at 90°', async () => {
    const keys = [
      createKey({
        x: 1,
        y: 0,
        width: 1,
        height: 1,
        rotation_angle: 90,
        rotation_x: 0,
        rotation_y: 0,
      }),
    ]
    const options: PlateBuilderOptions = { cutoutType: 'alps-skcm' }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(1)

    // 15.5x12.8mm rotated 90° -> bounding box should be 12.8 wide, 15.5 tall
    const dims = polylineDimensions(polylines[0]!)
    expect(dims.width).toBeCloseTo(12.8, 6)
    expect(dims.height).toBeCloseTo(15.5, 6)
  })

  // Test 10
  it('kerf adjustment – single key shrinks cutout but stays centered', async () => {
    const keys = [createKey({ x: 0, y: 0, width: 1, height: 1 })]
    const options: PlateBuilderOptions = {
      cutoutType: 'cherry-mx-basic',
      sizeAdjust: 0.5,
    }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(1)

    const dims = polylineDimensions(polylines[0]!)
    expect(dims.width).toBe(13.5) // 14 - 0.5
    expect(dims.height).toBe(13.5)

    const center = polylineCenter(polylines[0]!)
    expect(center.x).toBe(0)
    expect(center.y).toBe(0)
  })

  // Test 11
  it('kerf adjustment – two keys: spacing preserved, cutouts shrink', async () => {
    const keys = [
      createKey({ x: 0, y: 0, width: 1, height: 1 }),
      createKey({ x: 1, y: 0, width: 1, height: 1 }),
    ]
    const options: PlateBuilderOptions = {
      cutoutType: 'cherry-mx-basic',
      sizeAdjust: 0.5,
    }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(2)

    // Each cutout is 13.5mm
    polylines.forEach((poly) => {
      const dims = polylineDimensions(poly)
      expect(dims.width).toBe(13.5)
      expect(dims.height).toBe(13.5)
    })

    const c0 = polylineCenter(polylines[0]!)
    expect(c0.x).toBe(0)

    const c1 = polylineCenter(polylines[1]!)
    expect(c1.x).toBe(19.05)

    // Critical: kerf does NOT change spacing
    expect(distanceBetweenCenters(polylines[0]!, polylines[1]!)).toBe(19.05)
  })

  // Test 12
  it('negative kerf (expansion) – single key', async () => {
    const keys = [createKey({ x: 0, y: 0, width: 1, height: 1 })]
    const options: PlateBuilderOptions = {
      cutoutType: 'cherry-mx-basic',
      sizeAdjust: -0.5,
    }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    const dims = polylineDimensions(polylines[0]!)
    expect(dims.width).toBe(14.5) // 14 - (-0.5)
    expect(dims.height).toBe(14.5)

    const center = polylineCenter(polylines[0]!)
    expect(center.x).toBe(0)
    expect(center.y).toBe(0)
  })

  // Test 13
  it('kerf with non-square Alps SKCM cutout', async () => {
    const keys = [createKey({ x: 0, y: 0, width: 1, height: 1 })]
    const options: PlateBuilderOptions = {
      cutoutType: 'alps-skcm',
      sizeAdjust: 0.5,
    }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    const dims = polylineDimensions(polylines[0]!)
    expect(dims.width).toBe(15) // 15.5 - 0.5
    expect(dims.height).toBe(12.3) // 12.8 - 0.5

    const center = polylineCenter(polylines[0]!)
    expect(center.x).toBe(0)
    expect(center.y).toBe(0)
  })

  // Test 14 — rotation involves trig, use toBeCloseTo
  it('two rotated keys at 30° – center-to-center distance = 19.05mm', async () => {
    const keys = [
      createKey({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        rotation_angle: 30,
        rotation_x: 0,
        rotation_y: 0,
      }),
      createKey({
        x: 1,
        y: 0,
        width: 1,
        height: 1,
        rotation_angle: 30,
        rotation_x: 0,
        rotation_y: 0,
      }),
    ]
    const options: PlateBuilderOptions = { cutoutType: 'cherry-mx-basic' }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(2)
    expect(distanceBetweenCenters(polylines[0]!, polylines[1]!)).toBeCloseTo(19.05, 6)
  })

  // Test 15
  it('decal and ghost keys are filtered out', async () => {
    const keys = [
      createKey({ x: 0, y: 0, width: 1, height: 1, decal: true }),
      createKey({ x: 1, y: 0, width: 1, height: 1, ghost: true }),
      createKey({ x: 2, y: 0, width: 1, height: 1 }),
    ]
    const options: PlateBuilderOptions = { cutoutType: 'cherry-mx-basic' }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    // Only Key3 produces a cutout
    expect(polylines).toHaveLength(1)

    // Key3 becomes origin, so cutout centered at (0, 0)
    const center = polylineCenter(polylines[0]!)
    expect(center.x).toBe(0)
    expect(center.y).toBe(0)
  })

  // Test 16
  it('custom rectangle cutout – 16x12mm', async () => {
    const keys = [createKey({ x: 0, y: 0, width: 1, height: 1 })]
    const options: PlateBuilderOptions = {
      cutoutType: 'custom-rectangle',
      customCutoutWidth: 16,
      customCutoutHeight: 12,
    }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(1)
    expect(polylines[0]).toHaveLength(4)

    const dims = polylineDimensions(polylines[0]!)
    expect(dims.width).toBe(16)
    expect(dims.height).toBe(12)

    const center = polylineCenter(polylines[0]!)
    expect(center.x).toBe(0)
    expect(center.y).toBe(0)
  })

  // Test 17
  it('two keys diagonal with custom spacing', async () => {
    const keys = [
      createKey({ x: 0, y: 0, width: 1, height: 1 }),
      createKey({ x: 1, y: 1, width: 1, height: 1 }),
    ]
    const options: PlateBuilderOptions = {
      cutoutType: 'cherry-mx-basic',
      spacingX: 18,
      spacingY: 17,
    }

    const result = await buildPlate(keys, options)
    const polylines = parseDxfPolylines(result.dxfContent)

    expect(polylines).toHaveLength(2)

    const c0 = polylineCenter(polylines[0]!)
    expect(c0.x).toBe(0)
    expect(c0.y).toBe(0)

    const c1 = polylineCenter(polylines[1]!)
    expect(c1.x).toBe(18)
    expect(c1.y).toBe(-17) // Y inverted

    // sqrt(18^2 + 17^2) = sqrt(613) — irrational, must use toBeCloseTo
    expect(distanceBetweenCenters(polylines[0]!, polylines[1]!)).toBeCloseTo(Math.sqrt(613), 6)
  })
})
