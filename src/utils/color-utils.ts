export interface HSV {
  h: number // 0-360
  s: number // 0-100
  v: number // 0-100
}

export interface RGB {
  r: number // 0-255
  g: number // 0-255
  b: number // 0-255
}

// Convert HSV to RGB
export function hsvToRgb(h: number, s: number, v: number): RGB {
  h = h / 360
  s = s / 100
  v = v / 100

  const c = v * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = v - c

  let r = 0,
    g = 0,
    b = 0

  if (0 <= h && h < 1 / 6) {
    r = c
    g = x
    b = 0
  } else if (1 / 6 <= h && h < 2 / 6) {
    r = x
    g = c
    b = 0
  } else if (2 / 6 <= h && h < 3 / 6) {
    r = 0
    g = c
    b = x
  } else if (3 / 6 <= h && h < 4 / 6) {
    r = 0
    g = x
    b = c
  } else if (4 / 6 <= h && h < 5 / 6) {
    r = x
    g = 0
    b = c
  } else if (5 / 6 <= h && h < 1) {
    r = c
    g = 0
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

// Convert RGB to HSV
export function rgbToHsv(r: number, g: number, b: number): HSV {
  r = r / 255
  g = g / 255
  b = b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  let h = 0
  const s = max === 0 ? 0 : diff / max
  const v = max

  if (diff !== 0) {
    if (max === r) {
      h = ((g - b) / diff) % 6
    } else if (max === g) {
      h = (b - r) / diff + 2
    } else {
      h = (r - g) / diff + 4
    }
    h *= 60
    if (h < 0) h += 360
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  }
}

// Convert HEX to RGB (handles both 6-digit and 8-digit hex, ignoring alpha bytes)
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1] ?? '0', 16),
        g: parseInt(result[2] ?? '0', 16),
        b: parseInt(result[3] ?? '0', 16),
      }
    : { r: 0, g: 0, b: 0 }
}

// Convert RGB to HEX
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Convert HEX to HSV
export function hexToHsv(hex: string): HSV {
  const rgb = hexToRgb(hex)
  return rgbToHsv(rgb.r, rgb.g, rgb.b)
}

// Convert HSV to HEX
export function hsvToHex(h: number, s: number, v: number): string {
  const rgb = hsvToRgb(h, s, v)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

// Validate HEX color (6-digit or 8-digit)
export function isValidHex(hex: string): boolean {
  return /^#?[0-9A-F]{6}([0-9A-F]{2})?$/i.test(hex)
}

// Extract alpha value (0-100) from 8-digit hex. Returns 100 for 6-digit hex.
export function hexToAlpha(hex: string): number {
  const match = /^#?[0-9A-F]{6}([0-9A-F]{2})$/i.exec(hex)
  if (!match) return 100
  return Math.round((parseInt(match[1] ?? 'ff', 16) / 255) * 100)
}

// Combine 6-digit hex + alpha (0-100) into 8-digit hex
export function hexWithAlpha(hex6: string, alpha: number): string {
  const normalized = hex6.startsWith('#') ? hex6 : `#${hex6}`
  const base = normalized.substring(0, 7) // ensure only #RRGGBB
  const alphaByte = Math.round((Math.max(0, Math.min(100, alpha)) / 100) * 255)
  const alphaHex = alphaByte.toString(16).padStart(2, '0')
  return `${base}${alphaHex}`
}

// Ensure HEX has # prefix
export function normalizeHex(hex: string): string {
  return hex.startsWith('#') ? hex : `#${hex}`
}

/**
 * Lighten a hex color using the CIE Lab color space for perceptually uniform results.
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
 * Inverse of lightenColor: given a target key-top color, return the KLE base color
 * that would produce it after lightening.
 *
 * Mathematically this divides L* by `factor` (multiplies by 1/factor).
 * Note: when the target color is very light (L* > 100/factor ≈ 83.3 for the default
 * factor of 1.2), the forward pass would have been clamped at L*=100, so multiple
 * base colors map to the same top color — the returned value is the closest answer.
 *
 * @param color  - 6-digit hex string of the desired key-top color
 * @param factor - Same factor used in lightenColor (default 1.2)
 * @returns KLE base color to set, or input unchanged if not a valid 6-digit hex
 */
export function invertLightenColor(color: string, factor = 1.2): string {
  return lightenColor(color, 1 / factor)
}
