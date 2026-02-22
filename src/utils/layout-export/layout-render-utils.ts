import type { Key, KeyboardMetadata } from '@adamws/kle-serial'
import type { LayoutRenderInput, KeyRenderData } from './LayoutRendererTypes'

export const DEFAULT_UNIT = 54

/** Visual padding around the key area — matches KeyboardCanvas.vue CANVAS_BORDER */
export const LAYOUT_PADDING = 9

/** Escape text for safe embedding in HTML/SVG attributes and content */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Sanitize a label string for safe embedding in HTML template literals */
export function sanitizeLabelForHtml(s: string): string {
  return s.replace(/`/g, '&#96;').replace(/<\/script/gi, '<\\/script')
}

/** Get the label at a given index from a key, sanitized for HTML */
export function getLabelAtIndex(key: Key, index: number): string {
  if (key.labels && Array.isArray(key.labels)) {
    const v = key.labels[index]
    if (typeof v === 'string' && v.trim().length > 0) {
      return sanitizeLabelForHtml(v)
    }
  }
  return ''
}

/**
 * Lighten a hex color using the CIE Lab color space for perceptually uniform results.
 * Extracted from KeyRenderer.computeLightenColor — pure function, no canvas dependencies.
 *
 * @param color  - 6-digit hex string, e.g. '#cccccc'
 * @param factor - Lightening factor applied to L* (default 1.2 matches KeyRenderer usage)
 * @returns Lightened hex color, or input unchanged if not a valid 6-digit hex
 */
export function lightenColor(color: string, factor = 1.2): string {
  const hex = color.replace('#', '')
  if (hex.length !== 6) return color

  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  // Convert sRGB to linear RGB for proper color math
  const toLinear = (c: number) => {
    const sRGB = c / 255
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  }

  const fromLinear = (c: number) => {
    if (c <= 0.0031308) {
      return c * 12.92 * 255
    }
    return (1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255
  }

  // Convert to CIE XYZ then to Lab
  const rLinear = toLinear(r)
  const gLinear = toLinear(g)
  const bLinear = toLinear(b)

  // D65 illuminant, sRGB primaries
  const x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375
  const y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.072175
  const z = rLinear * 0.0193339 + gLinear * 0.119192 + bLinear * 0.9503041

  // Normalize to D65 white point
  const xn = x / 0.95047
  const yn = y / 1.0
  const zn = z / 1.08883

  // Convert to Lab
  const fx = xn > 0.008856 ? Math.pow(xn, 1 / 3) : 7.787 * xn + 16 / 116
  const fy = yn > 0.008856 ? Math.pow(yn, 1 / 3) : 7.787 * yn + 16 / 116
  const fz = zn > 0.008856 ? Math.pow(zn, 1 / 3) : 7.787 * zn + 16 / 116

  let lStar = 116 * fy - 16
  const aStar = 500 * (fx - fy)
  const bStar = 200 * (fy - fz)

  // Apply lightening to L* component
  lStar = Math.min(100, lStar * factor)

  // Convert back to XYZ
  const fyNew = (lStar + 16) / 116
  const fxNew = aStar / 500 + fyNew
  const fzNew = fyNew - bStar / 200

  const xNew = (fxNew > 0.206893 ? Math.pow(fxNew, 3) : (fxNew * 116 - 16) / 903.3) * 0.95047
  const yNew = lStar > 8 ? Math.pow(fyNew, 3) : lStar / 903.3
  const zNew = (fzNew > 0.206893 ? Math.pow(fzNew, 3) : (fzNew * 116 - 16) / 903.3) * 1.08883

  // Convert back to sRGB
  const rNew = xNew * 3.2404542 + yNew * -1.5371385 + zNew * -0.4985314
  const gNew = xNew * -0.969266 + yNew * 1.8760108 + zNew * 0.041556
  const bNew = xNew * 0.0556434 + yNew * -0.2040259 + zNew * 1.0572252

  // Convert back to 8-bit values
  const rFinal = Math.min(255, Math.max(0, Math.round(fromLinear(rNew))))
  const gFinal = Math.min(255, Math.max(0, Math.round(fromLinear(gNew))))
  const bFinal = Math.min(255, Math.max(0, Math.round(fromLinear(bNew))))

  return `#${rFinal.toString(16).padStart(2, '0')}${gFinal.toString(16).padStart(2, '0')}${bFinal.toString(16).padStart(2, '0')}`
}

/**
 * Normalize raw store data into a LayoutRenderInput.
 * Pure function — no Vue/store dependencies.
 */
export function normalizeLayoutInput(
  keys: Key[],
  metadata: KeyboardMetadata,
  filename: string,
  unit: number = DEFAULT_UNIT,
): LayoutRenderInput {
  const minX = Math.min(...keys.map((k) => k.x ?? 0))
  const minY = Math.min(...keys.map((k) => k.y ?? 0))
  const maxX = Math.max(...keys.map((k) => (k.x ?? 0) + (k.width ?? 1)))
  const maxY = Math.max(...keys.map((k) => (k.y ?? 0) + (k.height ?? 1)))

  const boardWidth = Math.max(0, maxX - minX) * unit + LAYOUT_PADDING * 2
  const boardHeight = Math.max(0, maxY - minY) * unit + LAYOUT_PADDING * 2

  const normalizedKeys: KeyRenderData[] = keys.map((key) => {
    const darkColor = key.color || '#cccccc'
    const lightColor = lightenColor(darkColor)
    return {
      left: (Number(key.x ?? 0) - minX) * unit + LAYOUT_PADDING,
      top: (Number(key.y ?? 0) - minY) * unit + LAYOUT_PADDING,
      width: Number(key.width ?? 1) * unit,
      height: Number(key.height ?? 1) * unit,
      topLeftLabel: getLabelAtIndex(key, 0),
      bottomLeftLabel: getLabelAtIndex(key, 6),
      darkColor,
      lightColor,
    }
  })

  return {
    layoutName: metadata.name || filename || 'Keyboard Layout',
    author: metadata.author || '',
    backColor: metadata.backcolor || '#ffffff',
    radiiValue: metadata.radii?.trim() || '6px',
    unit,
    boardWidth,
    boardHeight,
    keys: normalizedKeys,
  }
}
