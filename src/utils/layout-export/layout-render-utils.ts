import type { Key, KeyboardMetadata } from '@adamws/kle-serial'
import type { LayoutRenderInput, KeyRenderData } from './LayoutRendererTypes'

export const DEFAULT_UNIT = 54

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

  const boardWidth = Math.max(0, maxX - minX) * unit
  const boardHeight = Math.max(0, maxY - minY) * unit

  const normalizedKeys: KeyRenderData[] = keys.map((key) => ({
    left: (Number(key.x ?? 0) - minX) * unit,
    top: (Number(key.y ?? 0) - minY) * unit,
    width: Number(key.width ?? 1) * unit,
    height: Number(key.height ?? 1) * unit,
    topLeftLabel: getLabelAtIndex(key, 0),
    bottomLeftLabel: getLabelAtIndex(key, 6),
  }))

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
