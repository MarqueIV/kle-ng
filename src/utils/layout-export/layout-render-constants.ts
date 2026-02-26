// Bevel constants matching KeyRenderer.defaultSizes.
// Single source of truth for both HtmlLayoutRenderer and SvgLayoutRenderer.

export const BEVEL_MARGIN = 6
export const BEVEL_OFFSET_TOP = 3
export const BEVEL_OFFSET_BOTTOM = 3

// Inner rect offsets from outer rect edges:
//   left:   BEVEL_MARGIN                          = 6
//   top:    BEVEL_MARGIN - BEVEL_OFFSET_TOP       = 3
//   right:  BEVEL_MARGIN                          = 6  (inset)
//   bottom: BEVEL_MARGIN + BEVEL_OFFSET_BOTTOM    = 9  (inset)
// Width reduction:  6 + 6  = 12
// Height reduction: 3 + 9  = 12
export const INNER_LEFT = BEVEL_MARGIN
export const INNER_TOP = BEVEL_MARGIN - BEVEL_OFFSET_TOP
export const INNER_SIZE_REDUCTION =
  BEVEL_MARGIN + (BEVEL_MARGIN - BEVEL_OFFSET_TOP) + BEVEL_OFFSET_BOTTOM // 12

export const ROUND_OUTER = 5
export const ROUND_INNER = 3

export const NUB_WIDTH = 10
export const NUB_HEIGHT = 2
export const NUB_DEPTH_FRACTION = 0.9

// HTML-only: key elements render at width+1/height+1 for border overlap
// (see HtmlLayoutRenderer.ts — the inset box-shadow / adjacent-key seam technique).
// CSS .key-inner right/bottom offsets include this extra pixel.
export const HTML_INNER_RIGHT = BEVEL_MARGIN + 1 // 7  (CSS right:7px)
export const HTML_INNER_BOTTOM = BEVEL_MARGIN + BEVEL_OFFSET_BOTTOM + 1 // 10 (CSS bottom:10px)
