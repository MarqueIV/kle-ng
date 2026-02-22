import type { LayoutRenderer, LayoutRenderInput, KeyRenderData } from './LayoutRendererTypes'
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
      overflow: hidden;
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
    .label-tl,
    .label-bl {
      position: absolute;
      left: 8px;
      color: var(--text);
      font-size: 11px;
      line-height: 1;
      pointer-events: none;
      white-space: nowrap;
      text-align: left;
    }
    .label-tl {
      top: 6px;
    }
    .label-bl {
      bottom: 6px;
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

  private renderKey(key: KeyRenderData): string {
    const { left, top, width, height, topLeftLabel, bottomLeftLabel, darkColor, lightColor } = key
    return `<div class="key" style="left:${left}px;top:${top}px;width:${width + 1}px;height:${height + 1}px;background:${darkColor};">
          <div class="key-inner" style="background:${lightColor};">
            ${topLeftLabel ? `<span class="label-tl">${topLeftLabel}</span>` : ''}
            ${bottomLeftLabel ? `<span class="label-bl">${bottomLeftLabel}</span>` : ''}
          </div>
        </div>`
  }
}

export const htmlLayoutRenderer = new HtmlLayoutRenderer()
