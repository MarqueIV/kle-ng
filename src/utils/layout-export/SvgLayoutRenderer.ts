import type {
  LayoutRenderer,
  LayoutRenderInput,
  KeyRenderData,
  LabelData,
} from './LayoutRendererTypes'
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
  private _measureCtx: CanvasRenderingContext2D | null | undefined = undefined

  private getMeasureCtx(): CanvasRenderingContext2D | null {
    if (this._measureCtx === undefined) {
      try {
        const canvas = document.createElement('canvas')
        this._measureCtx = canvas.getContext('2d')
      } catch {
        this._measureCtx = null
      }
    }
    return this._measureCtx
  }

  private wrapText(text: string, fontSize: number, maxWidth: number): string[] {
    const ctx = this.getMeasureCtx()
    if (!ctx || maxWidth <= 0) return [text]

    ctx.font = `${fontSize}px sans-serif`
    const words = text.split(' ')
    const lines: string[] = []
    let current = ''

    for (const word of words) {
      const test = current ? current + ' ' + word : word
      if (ctx.measureText(test).width <= maxWidth) {
        current = test
      } else {
        if (current) lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)

    return lines.length > 0 ? lines : [text]
  }

  private renderLabel(label: LabelData, keyLeft: number, keyTop: number): string {
    const { text, fontSize, color, align, baseline, relX, relY, maxWidth, maxHeight } = label
    const lineHeight = fontSize * 1.2
    const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight))

    const lines = this.wrapText(text, fontSize, maxWidth).slice(0, maxLines)
    const absX = keyLeft + relX
    const n = lines.length

    // Mirror the canvas textBaseline exactly: relY is the anchor point for that
    // baseline type and maps 1-to-1 to the matching SVG dominant-baseline.
    //   hanging    → dominant-baseline="hanging",    Y = top of em box  → startY = relY
    //   middle     → dominant-baseline="middle",     Y = middle of em box → startY = relY
    //   alphabetic → dominant-baseline="auto",       Y = alphabetic base → startY = relY
    //
    // For multi-line blocks the first line's Y is shifted so the whole block is
    // anchored at relY (the same role each line plays on the canvas):
    //   hanging:    block flows down from relY → no shift
    //   middle:     center of block at relY → first line up by (n-1)*lineHeight/2
    //   alphabetic: last line's baseline at relY → first line up by (n-1)*lineHeight
    const svgBaseline =
      baseline === 'hanging' ? 'hanging' : baseline === 'middle' ? 'middle' : 'auto'
    const startY =
      baseline === 'hanging'
        ? keyTop + relY
        : baseline === 'middle'
          ? keyTop + relY - ((n - 1) * lineHeight) / 2
          : keyTop + relY - (n - 1) * lineHeight

    const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle'
    const escapedLines = lines.map((l) => escapeHtml(l))

    const commonAttrs = `font-size="${fontSize}" fill="${color}" font-family="sans-serif" text-anchor="${anchor}" dominant-baseline="${svgBaseline}"`

    if (lines.length === 1) {
      return `<text x="${absX}" y="${startY}" ${commonAttrs}>${escapedLines[0]}</text>`
    }

    const tspans = escapedLines
      .map((line, i) => `<tspan x="${absX}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`)
      .join('')
    return `<text x="${absX}" y="${startY}" ${commonAttrs}>${tspans}</text>`
  }

  render(input: LayoutRenderInput): string {
    const { layoutName, backColor, radiiValue, boardWidth, boardHeight, keys } = input

    const boardRx = parseInt(radiiValue, 10) || 0
    const keysXml = keys.map((k) => this.renderKey(k)).join('\n  ')

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${boardWidth} ${boardHeight}"
     width="${boardWidth}" height="${boardHeight}"
     overflow="visible">
  <title>${escapeHtml(layoutName)}</title>
  <rect width="${boardWidth}" height="${boardHeight}" fill="${backColor}" rx="${boardRx}"/>
  ${keysXml}
</svg>`
  }

  private renderKey(key: KeyRenderData): string {
    const {
      left,
      top,
      width,
      height,
      labels,
      rotationAngle,
      rotationOriginX,
      rotationOriginY,
      darkColor,
      lightColor,
    } = key

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

    const labelsXml = labels.map((l) => this.renderLabel(l, left, top)).join('\n    ')
    const labelsTag = labelsXml ? `\n    ${labelsXml}` : ''

    const content = `<rect x="${outerX}" y="${outerY}" width="${outerW}" height="${outerH}" fill="${darkColor}" stroke="#000000" stroke-width="1" rx="${ROUND_OUTER}"/>
    <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" fill="${lightColor}" rx="${ROUND_INNER}"/>${labelsTag}`

    if (rotationAngle !== 0) {
      return `<g transform="rotate(${rotationAngle}, ${rotationOriginX}, ${rotationOriginY})">
    ${content}
  </g>`
    }

    return `<g>
    ${content}
  </g>`
  }
}

export const svgLayoutRenderer = new SvgLayoutRenderer()
