# Layout Export

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [HTML Renderer](#html-renderer)
- [SVG Renderer](#svg-renderer)
- [Integration](#integration)
- [Implementation Notes](#implementation-notes)

---

## Overview

The `layout-export` module converts a kle-ng keyboard layout into standalone, self-contained files for distribution. It provides two export targets:

- **HTML** — a complete document with embedded CSS that renders the keyboard visually in any browser.
- **SVG** — a vector graphics file suitable for embedding in documents, editing in vector tools, or printing at any scale.

Both renderers share a common normalized data model, geometry constants, and utility functions, ensuring visual consistency between the two output formats and with the live canvas in the editor. The module has no Vue or store dependencies — the sole connection point to the application is `normalizeLayoutInput`, which converts raw `Key[]` and `KeyboardMetadata` into a framework-independent structure that the renderers consume.

---

## Architecture

```
layout-export/
├── index.ts                   Public API — re-exports from all submodules
├── LayoutRendererTypes.ts     Shared type definitions (interfaces only)
├── layout-render-constants.ts Numeric constants (bevel geometry, radii, nub)
├── layout-render-geometry.ts  Pure geometry functions (inner rect, nub, text Y)
├── layout-render-utils.ts     Input normalization and string-safety utilities
├── HtmlLayoutRenderer.ts      HTML renderer
├── SvgLayoutRenderer.ts       SVG renderer
└── __tests__/                 Vitest specs for all submodules
```

All consumer imports should come from `@/utils/layout-export` — never from submodule paths directly.

### Data Flow

```
Key[] + KeyboardMetadata
         │
         ▼
  normalizeLayoutInput()       layout-render-utils.ts
         │
         ▼
   LayoutRenderInput           LayoutRendererTypes.ts
         │
         ├────────────────────────┐
         ▼                        ▼
HtmlLayoutRenderer.render()  SvgLayoutRenderer.render()
         │                        │
         ▼                        ▼
    string (HTML)            string (SVG)
```

Constants in `layout-render-constants.ts` are derived from `KeyRenderer.defaultSizes` in the canvas pipeline. This shared source of truth ensures the exported output is visually identical to the editor canvas.

---

## Data Model

### Normalization: `normalizeLayoutInput`

`normalizeLayoutInput(keys, metadata, filename, unit?)` is a pure function that converts raw store data into a renderer-ready `LayoutRenderInput`. It does the following:

1. **Bounds calculation**: Uses `BoundsCalculator` to find the rotation-aware axis-aligned bounding box of all keys. Rotated keys' four corners are individually transformed before the box is computed, so board dimensions are always correct even for complex rotated layouts.

2. **Coordinate translation**: All key positions are offset so the minimum key corner sits at `(LAYOUT_PADDING, LAYOUT_PADDING)`. Coordinates in `KeyRenderData` are ready for direct use by renderers.

3. **Label resolution**: For each of the 12 possible label positions, whitespace-only slots are skipped. Each kept label gets a computed pixel `fontSize` (base formula: `6 + 2 * textSize`; front legends at positions 9–11 are capped smaller), alignment and baseline derived from the position's column/row, and anchor coordinates (`relX`, `relY`) relative to the key's outer rect.

4. **Color resolution**: The outer bevel color comes from `key.color` (defaulting to `#cccccc`). The inner cap color is produced by lightening that color in CIE Lab space, matching the canvas renderer.

5. **Special flags**: `ghost`, `decal`, `nub`, and `isRotaryEncoder` are included only when `true`.

6. **Non-rectangular geometry**: When a key has a second rectangle (ISO Enter, Big-Ass Enter), `left2`/`top2`/`width2`/`height2` are computed in the same board-space coordinate system as the primary rectangle.

### Key Types

**`LayoutRenderInput`** is the top-level structure passed to each renderer. It carries board dimensions (accounting for rotation), background color, border-radius string, unit size, and the array of `KeyRenderData`.

**`KeyRenderData`** describes a single key in board-space pixels. Coordinates are already padded and translated. Optional fields `left2`/`top2`/`width2`/`height2` are present only for non-rectangular keys. Special rendering flags (`ghost`, `decal`, `nub`, `isRotaryEncoder`) are present only when true.

**`LabelData`** describes a single label on a key. `relX`/`relY` define the anchor point within the key's outer rect. `align` (`left`/`center`/`right`) and `baseline` (`hanging`/`middle`/`alphabetic`) describe how the anchor maps to the text box — these semantics match SVG's `text-anchor` and `dominant-baseline` and are approximated in HTML with arithmetic.

**`LayoutRenderer`** is a single-method interface (`render(input): string`) that both renderers implement. The returned string is ready for use as a `Blob` for file download.

### Label Position Grid

KLE supports up to 12 label positions per key arranged in a 3×4 grid: a 3×3 top-surface grid plus a row of 3 front-legend positions (side print).

```
Top surface:
┌────────────────────────────────────────────┐
│  [0] top-left  [1] top-ctr  [2] top-right  │
│  [3] mid-left  [4] mid-ctr  [5] mid-right  │
│  [6] bot-left  [7] bot-ctr  [8] bot-right  │
└────────────────────────────────────────────┘
Front face:
  [9] front-left  [10] front-ctr  [11] front-right
```

Column determines `align` (left/center/right). Row determines `baseline` (hanging/middle/alphabetic, with front legends using hanging). The alignment and anchor values are baked into each `LabelData` entry at normalization time, so renderers iterate `labels` without any awareness of position index.

### Constants

All sizing constants are in `layout-render-constants.ts`. The key rendering model uses a **two-rectangle structure**: an outer rectangle (dark bevel area, 5px corner radius) and an inner rectangle (lighter keycap surface, 3px corner radius). The inner rect is inset asymmetrically — 6px from the left/right and top (3px inset) and bottom (9px inset) — to simulate the taller lower bevel of a physical keycap. The default unit size is 54px per 1u, matching the editor canvas. A 9px padding is added around the key area on all sides.

---

## HTML Renderer

`HtmlLayoutRenderer` produces a complete `<!DOCTYPE html>` document with embedded CSS. The `.board` div uses absolute positioning for all keys; the document has no external dependencies.

### Key Rendering

Each key is a `position: absolute` div placed at its board-space coordinates. The key's outer div uses `box-shadow: inset` for the 1px border, which keeps the border entirely within the element's layout bounds.

**Border overlap**: Each key div is rendered 1 pixel larger than its nominal cell size. Adjacent keys therefore overlap by 1px. Because both borders are inset, they cover the same pixel and produce a single visible edge — matching the appearance of physical adjacent keys. The inner cap's CSS offsets absorb this extra pixel so the cap surface size is correct.

**Rotation**: Rotated keys receive CSS `transform: rotate(...)` with a `transform-origin` expressed relative to the key div's top-left corner (the renderer converts board-space origin to element-relative coordinates).

### Special Key Types

- **Ghost**: outer div gets `opacity: 0.3`.
- **Decal**: no outer or inner div; only labels are emitted in a plain positioned container.
- **Homing nub**: a small dark bar is added as an absolutely-positioned child div inside the key, centered horizontally and placed near the bottom of the inner cap.
- **Rotary encoder**: outer and inner divs both get `border-radius: 50%`; the inner div uses equal insets on all sides instead of the asymmetric bevel.

### Non-rectangular Keys

Non-rectangular keys (ISO Enter, Big-Ass Enter) need two overlapping rectangles to form the shape. The HTML renderer uses a `0×0` overflow-visible container positioned at the primary rect's board coordinates, then emits both outer rects, a borderless filler div that covers the border seam at the junction, both inner cap rects, and finally the labels wrapper — all as absolutely positioned children of the container. The filler div is drawn after the second outer rect so its fill overpaints any inset shadow pixel that would otherwise be visible at the junction.

---

## SVG Renderer

`SvgLayoutRenderer` produces a standalone SVG document rooted at `<svg>` with `overflow="visible"` (so rotated keys that extend beyond the board boundary are not clipped).

### Key Rendering

Each key is wrapped in a `<g>` element. Rotated keys receive a `transform="rotate(angle, originX, originY)"` attribute using the board-space origin directly (SVG's rotation transform takes an explicit origin, unlike CSS).

The outer rect is offset by 0.5px on both axes. SVG strokes are centered on the path, so an integer position would put half the stroke outside the nominal boundary. The 0.5px offset shifts the stroke center to the pixel boundary, making adjacent keys' strokes overlap by exactly 1px — the same single-visible-border behavior as the HTML renderer.

### Label Rendering

The renderer handles three label content types:

- **Plain text**: rendered as a `<text>` element. Multi-line text (word-wrapped using `CanvasRenderingContext2D.measureText`) uses `<tspan>` elements with `dy` offsets. The Y position of the first line is computed by `computeMultiLineStartY` so the baseline type aligns correctly for all line counts.

- **Formatted text**: when label text contains HTML tags (`<b>`, `<strong>`, `<i>`, `<em>`), it is parsed by `labelParser` into an AST and rendered as nested `<tspan>` elements with inline `font-weight` or `font-style` attributes.

- **SVG images**: when label text is itself an SVG document (matching a specific pattern), it is encoded as a Base64 data URL and rendered as an `<image>` element. Dimensions are taken from the SVG's own `width`/`height` attributes and clamped to the label's `maxWidth`/`maxHeight`.

### Non-rectangular Keys

The SVG renderer uses the `polygon-clipping` library to compute the geometric union of the two rounded rectangles and emit a single `<path>` element per layer (outer bevel, inner cap). Each rectangle is approximated as a polygon with 8-segment arc corners, the union is computed, and the result is converted to an SVG `d` string. This eliminates the visible seam that would appear at the junction of two separately-stroked rectangles.

If the union computation throws, the renderer falls back to four separate `<rect>` elements drawn in the correct order so each successive fill covers the previous element's border seam.

---

## Integration

The standard pattern is:

```typescript
import { normalizeLayoutInput, htmlLayoutRenderer, svgLayoutRenderer } from '@/utils/layout-export'

const input = normalizeLayoutInput(keys, metadata, filename)
const html = htmlLayoutRenderer.render(input)
const svg  = svgLayoutRenderer.render(input)
```

`normalizeLayoutInput` can be called once and the resulting `LayoutRenderInput` passed to both renderers. To change output scale, pass a custom `unit` as the fourth argument (default is 54). Bevel and border constants do not scale with `unit`, so very small unit values will produce disproportionate bevels.

The application's integration point is `KeyboardToolbar.vue`, which uses the File System Access API (`showSaveFilePicker`) when available and falls back to a programmatic anchor download. A dismissed file picker dialog throws an `AbortError` that is silently ignored.

Both `htmlLayoutRenderer` and `svgLayoutRenderer` are module-level singleton exports. Use them in application code. Use `new HtmlLayoutRenderer()` / `new SvgLayoutRenderer()` in tests where per-test isolation is needed.

---

## Implementation Notes

**Coordinate systems**: Store coordinates (`Key.x`, `Key.y`) are in keyboard units. `KeyRenderData` coordinates are in board-space pixels with the minimum key corner at `(LAYOUT_PADDING, LAYOUT_PADDING)`. The HTML renderer additionally converts the rotation origin from board-space to element-relative pixels for the CSS `transform-origin` property.

**`sanitizeLabelForHtml` vs `escapeHtml`**: These serve distinct purposes. `escapeHtml` escapes HTML special characters for use in element content and attributes (prevents tag injection). `sanitizeLabelForHtml` is applied to label text that appears inside JavaScript template literals in the generated HTML's `<script>`-adjacent context — it specifically prevents backtick and `</script` injection patterns that `escapeHtml` does not address.

**Canvas API dependency in SVG renderer**: `SvgLayoutRenderer` calls `document.createElement('canvas')` to obtain a `CanvasRenderingContext2D` for text measurement during word-wrap. In non-browser environments the canvas creation is caught and `_measureCtx` is set to `null`, causing `wrapText` to return the full text as a single unwrapped line. Tests that exercise multi-line wrapping must stub `document.createElement` and reset `_measureCtx` to `undefined` between runs.

**Testing**: The four spec files in `__tests__/` cover geometry functions, normalization logic, and both renderers. Run with `npx vitest run src/utils/layout-export`. Renderer tests verify output structure (number of elements, presence of attributes) rather than exact coordinates, making them robust to minor pixel-value changes.
