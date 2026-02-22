import type { LayoutRenderer, LayoutRenderInput, KeyRenderData } from './LayoutRendererTypes'
import { escapeHtml } from './layout-render-utils'

// Bevel constants matching KeyRenderer.defaultSizes
const BEVEL_MARGIN = 6
const BEVEL_OFFSET_TOP = 3
const BEVEL_OFFSET_BOTTOM = 3
const ROUND_OUTER = 5
const ROUND_INNER = 3

// Inner rect offsets from outer rect edges:
//   left:  BEVEL_MARGIN                          = 6
//   top:   BEVEL_MARGIN - BEVEL_OFFSET_TOP       = 3
//   right: BEVEL_MARGIN                          = 6  (inset)
//   bottom: BEVEL_MARGIN + BEVEL_OFFSET_BOTTOM   = 9  (inset)
// Width reduction:  6 + 6 = 12
// Height reduction: 3 + 9 = 12
const INNER_LEFT = BEVEL_MARGIN
const INNER_TOP = BEVEL_MARGIN - BEVEL_OFFSET_TOP
const INNER_SIZE_REDUCTION = BEVEL_MARGIN + (BEVEL_MARGIN - BEVEL_OFFSET_TOP) + BEVEL_OFFSET_BOTTOM // 12

export class SvgLayoutRenderer implements LayoutRenderer {
  render(input: LayoutRenderInput): string {
    const { layoutName, backColor, radiiValue, boardWidth, boardHeight, keys } = input

    const boardRx = parseInt(radiiValue, 10) || 0
    const keysXml = keys.map((k) => this.renderKey(k)).join('\n  ')

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${boardWidth} ${boardHeight}"
     width="${boardWidth}" height="${boardHeight}">
  <title>${escapeHtml(layoutName)}</title>
  <rect width="${boardWidth}" height="${boardHeight}" fill="${backColor}" rx="${boardRx}"/>
  ${keysXml}
</svg>`
  }

  private renderKey(key: KeyRenderData): string {
    const { left, top, width, height, topLeftLabel, bottomLeftLabel, darkColor, lightColor } = key

    // 0.5px offset aligns stroke center to pixel boundary for crisp 1px borders.
    // Width/height are NOT reduced: the stroke extends 0.5px beyond the nominal key
    // bounds, so adjacent keys' strokes overlap by 1px — matching canvas behaviour
    // where two side-by-side keys share a single border pixel rather than each
    // contributing their own border (which would produce a 2px double-edge).
    const outerX = left + 0.5
    const outerY = top + 0.5
    const outerW = width
    const outerH = height

    const innerX = left + INNER_LEFT
    const innerY = top + INNER_TOP
    const innerW = width - INNER_SIZE_REDUCTION
    const innerH = height - INNER_SIZE_REDUCTION

    const labelX = left + 8
    const topLabelY = top + 14
    const bottomLabelY = top + height - 8

    const topLabelTag = topLeftLabel
      ? `\n    <text x="${labelX}" y="${topLabelY}" font-size="11" fill="#111827">${escapeHtml(topLeftLabel)}</text>`
      : ''
    const bottomLabelTag = bottomLeftLabel
      ? `\n    <text x="${labelX}" y="${bottomLabelY}" font-size="11" fill="#111827">${escapeHtml(bottomLeftLabel)}</text>`
      : ''

    return `<g>
    <rect x="${outerX}" y="${outerY}" width="${outerW}" height="${outerH}" fill="${darkColor}" stroke="#000000" stroke-width="1" rx="${ROUND_OUTER}"/>
    <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" fill="${lightColor}" rx="${ROUND_INNER}"/>${topLabelTag}${bottomLabelTag}
  </g>`
  }
}

export const svgLayoutRenderer = new SvgLayoutRenderer()
