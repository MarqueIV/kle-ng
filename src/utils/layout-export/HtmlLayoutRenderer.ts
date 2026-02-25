import type {
  LayoutRenderer,
  LayoutRenderInput,
  KeyRenderData,
  LabelData,
} from './LayoutRendererTypes'
import { escapeHtml } from './layout-render-utils'

export class HtmlLayoutRenderer implements LayoutRenderer {
  render(input: LayoutRenderInput): string {
    const { layoutName, author, backColor, radiiValue, unit, boardWidth, boardHeight, keys } = input

    const keysHtml = keys.map((key) => this.renderKey(key)).join('\n')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(layoutName)}</title>
  <style>
    :root {
      --unit: ${unit}px;
      --board-width: ${boardWidth}px;
      --board-height: ${boardHeight}px;
      --text: #111827;
      --board-shadow: inset 0 0 0 1px #e5e7eb;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      display: flex;
      justify-content: center;
    }
    .keyboard-container {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 6px 18px rgba(2,6,23,0.08);
    }
    .keyboard-title {
      margin: 0 0 15px 0;
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }
    .keyboard-author {
      margin: 0 0 20px 0;
      font-size: 14px;
      color: #666;
    }
    .board {
      position: relative;
      width: var(--board-width);
      height: var(--board-height);
      background: ${backColor};
      border-radius: ${radiiValue};
      overflow: visible;
      box-shadow: var(--board-shadow);
    }
    .key {
      position: absolute;
      border-radius: 5px;
      /* inset box-shadow instead of border: the shadow stays inside the element
         bounds so the 1px it occupies does not reduce the content box.  Each key
         div is rendered 1px wider and 1px taller than its nominal grid cell
         (width+1 / height+1 in the inline style), making adjacent keys overlap
         by 1px.  Both inset shadows then cover the same pixel — producing a
         single 1px border instead of a double edge, matching canvas behaviour. */
      box-shadow: inset 0 0 0 1px #000000;
      overflow: hidden;
    }
    .key-inner {
      position: absolute;
      left: 6px;
      top: 3px;
      right: 7px;
      bottom: 10px;
      border-radius: 3px;
      overflow: hidden;
    }
    .key-label {
      position: absolute;
      overflow: hidden;
      overflow-wrap: break-word;
      word-break: break-word;
      line-height: 1.2;
      pointer-events: none;
    }
    .keyboard-footer {
      margin-top: 15px;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="keyboard-container">
    ${layoutName ? `<h1 class="keyboard-title">${escapeHtml(layoutName)}</h1>` : ''}
    ${author ? `<p class="keyboard-author">by ${escapeHtml(author)}</p>` : ''}
    <div class="board">
      ${keysHtml}
    </div>
    <p class="keyboard-footer">Created with <a href="https://editor.keyboard-tools.xyz/" target="_blank" rel="noopener">Keyboard Layout Editor NG</a></p>
  </div>
</body>
</html>`
  }

  private renderLabel(label: LabelData): string {
    const { text, fontSize, color, align, baseline, relX, relY, maxWidth } = label
    const lineHeight = fontSize * 1.2

    const cssLeft =
      align === 'left' ? relX : align === 'right' ? relX - maxWidth : relX - maxWidth / 2

    // Position the span so its baseline type aligns with relY.
    // CSS lacks explicit baseline-aware positioning for absolute elements; we approximate
    // using the typical baseline fraction within a line-height-1.2 box:
    //   hanging    → span top at relY  (hanging baseline ≈ top of em box)
    //   middle     → span center at relY  (span top = relY − lineHeight/2)
    //   alphabetic → alphabetic baseline ≈ 75% down the span  (span top = relY − 0.75·lineHeight)
    const cssTop =
      baseline === 'hanging'
        ? relY
        : baseline === 'middle'
          ? relY - lineHeight / 2
          : relY - lineHeight * 0.75

    return `<span class="key-label" style="left:${cssLeft}px;top:${cssTop}px;width:${maxWidth}px;font-size:${fontSize}px;color:${color};text-align:${align};">${text}</span>`
  }

  private renderHomingNub(keyWidth: number, keyHeight: number): string {
    const innerWidth = keyWidth - 12
    const nubLeft = 6 + (innerWidth - 10) / 2
    const innerHeight = keyHeight - 12
    const nubTop = 3 + innerHeight * 0.9 - 1
    return `<div style="position:absolute;left:${nubLeft}px;top:${nubTop}px;width:10px;height:2px;background:rgba(0,0,0,0.3);pointer-events:none;"></div>`
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
      ghost,
      decal,
      nub,
      isRotaryEncoder,
      left2,
      top2,
      width2,
      height2,
    } = key

    const rotateCss =
      rotationAngle !== 0
        ? `transform:rotate(${rotationAngle}deg);transform-origin:${rotationOriginX - left}px ${rotationOriginY - top}px;`
        : ''
    const ghostCss = ghost ? 'opacity:0.3;' : ''
    const labelsHtml = labels.map((l) => this.renderLabel(l)).join('')

    if (decal) {
      return `<div style="position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;${rotateCss}${ghostCss}">${labelsHtml}</div>`
    }

    const keyBorderRadius = isRotaryEncoder ? 'border-radius:50%;' : ''
    const innerBorderRadius = isRotaryEncoder
      ? 'border-radius:50%;left:6px;top:6px;right:6px;bottom:6px;'
      : ''
    const nubHtml = nub ? this.renderHomingNub(width, height) : ''

    const primaryHtml = `<div class="key" style="left:${left}px;top:${top}px;width:${width + 1}px;height:${height + 1}px;background:${darkColor};${rotateCss}${ghostCss}${keyBorderRadius}">
          <div class="key-inner" style="background:${lightColor};${innerBorderRadius}"></div>${nubHtml}${labelsHtml}
        </div>`

    if (left2 !== undefined && width2 !== undefined) {
      const secondHtml = `<div class="key" style="left:${left2}px;top:${top2}px;width:${width2 + 1}px;height:${height2! + 1}px;background:${darkColor};${rotateCss}${ghostCss}">
          <div class="key-inner" style="background:${lightColor};"></div>
        </div>`
      return primaryHtml + '\n' + secondHtml
    }

    return primaryHtml
  }
}

export const htmlLayoutRenderer = new HtmlLayoutRenderer()
