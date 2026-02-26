import {
  INNER_LEFT,
  INNER_TOP,
  INNER_SIZE_REDUCTION,
  NUB_WIDTH,
  NUB_DEPTH_FRACTION,
} from './layout-render-constants'

export function computeInnerRect(
  left: number,
  top: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: left + INNER_LEFT,
    y: top + INNER_TOP,
    w: w - INNER_SIZE_REDUCTION,
    h: h - INNER_SIZE_REDUCTION,
  }
}

export function computeMultiLineStartY(
  baseline: 'hanging' | 'middle' | 'alphabetic',
  anchorY: number,
  lineCount: number,
  lineHeight: number,
): number {
  if (baseline === 'hanging') return anchorY
  if (baseline === 'middle') return anchorY - ((lineCount - 1) * lineHeight) / 2
  return anchorY - (lineCount - 1) * lineHeight
}

// Calling conventions:
//   SVG renderer:  computeNubPosition(left, top, width, height) — absolute board coordinates
//   HTML renderer: computeNubPosition(0, 0, keyWidth, keyHeight) — element-relative
//     (the nub div is a child of an already-positioned key element)
export function computeNubPosition(
  left: number,
  top: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const inner = computeInnerRect(left, top, w, h)
  return {
    x: inner.x + (inner.w - NUB_WIDTH) / 2,
    y: inner.y + inner.h * NUB_DEPTH_FRACTION - 1,
  }
}
