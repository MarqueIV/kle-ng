# Layout Editor

The canvas editor is the main working area of KLE-NG. It provides a full set of tools for creating and editing keyboard layouts.

## Canvas Tools

The toolbar on the left side of the canvas contains the main editing tools:

| Tool | Description |
|------|-------------|
| **Selection Tool** | Select, move, resize keys |
| **Move Exactly Tool** | Move keys by a precise amount |
| **Rotate Selection Tool** | Rotate selected keys around anchor points |
| **Mirror Tool** | Create mirrored copies of selected keys |
| **Extra Tools** | Legend Tools, Matrix Coordinates, Move Rotation Origins, Theme Tools |

## Mouse Controls {#mouse-controls}

| Action | Result |
|--------|--------|
| **Left Click** | Select a key |
| **Left Click + Drag** | Create a rectangle selection |
| **Ctrl + Left Click** | Add/remove key from selection |
| **Middle Click + Drag** | Move selected keys |

## Keyboard Shortcuts {#keyboard-shortcuts}

| Shortcut | Action |
|----------|--------|
| <kbd>Ctrl</kbd>+<kbd>C</kbd> | Copy selected keys |
| <kbd>Ctrl</kbd>+<kbd>V</kbd> | Paste keys from clipboard |
| <kbd>Ctrl</kbd>+<kbd>X</kbd> | Cut selected keys |
| <kbd>Ctrl</kbd>+<kbd>A</kbd> | Select all keys |
| <kbd>Del</kbd> / <kbd>Backspace</kbd> | Delete selected keys |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undo last action |
| <kbd>Ctrl</kbd>+<kbd>]</kbd> | Select next key |
| <kbd>Ctrl</kbd>+<kbd>[</kbd> | Select previous key |
| <kbd>Arrow keys</kbd> | Nudge selected keys |
| <kbd>Shift</kbd>+<kbd>←</kbd><kbd>→</kbd> | Adjust key width |
| <kbd>Shift</kbd>+<kbd>↑</kbd><kbd>↓</kbd> | Adjust key height |
| <kbd>A</kbd> | Add new key |
| <kbd>/</kbd> | Toggle label search bar |
| <kbd>Shift</kbd>+<kbd>M</kbd> | Open Move Exactly tool |
| <kbd>Shift</kbd>+<kbd>R</kbd> | Open Rotate Selection tool |

## Selection Tool {#selection-tool}

The Selection Tool is the default tool for working with keys.

### Selecting Keys

- Click a key to select it
- Click and drag on empty canvas area to draw a rectangle selection
- Hold <kbd>Ctrl</kbd> while clicking to add or remove keys from the current selection
- Use <kbd>Ctrl</kbd>+<kbd>[</kbd> and <kbd>Ctrl</kbd>+<kbd>]</kbd> to cycle through keys in layout order

![Key selection animation](/key-selection.gif)

### Moving Keys

- **Middle mouse button**: Click and drag to move the selection
- **Arrow keys**: Nudge selected keys by the configured step size

![Mouse movement animation](/mouse-move.gif)

Movement snaps to a configurable step size (defined in U, where 1U = width of a standard key). The step size can be set in the canvas footer.

![Canvas footer controls](/canvas-footer-left.png){.docs-screenshot}

### Lock Rotations

The **Lock rotations** option determines how rotated keys move:

| Setting | Behavior |
|---------|----------|
| **Disabled** (default) | Rotation origin stays fixed; keys move in rotated coordinate space |
| **Enabled** | Rotation origin moves with the keys; movement occurs in normal coordinate space |

| Lock Disabled | Lock Enabled |
|:---:|:---:|
| ![Lock disabled](/lock-rotation-disabled-small.gif) | ![Lock enabled](/lock-rotation-enabled-small.gif) |

## Move Exactly Tool

For precise movement use the **Move Exactly** tool (<kbd>Shift</kbd>+<kbd>M</kbd>).

![Move exactly tool animation](/move-with-tool.gif)

The tool allows movement to any position, not limited to the step size. It also supports movement in **millimeters** by specifying the spacing (mm per U). The default spacing is **19.05 mm/U** for both X and Y axes, which is standard for Cherry MX style switches.

![Move exactly mm panel](/move-exactly-mm.png){.docs-screenshot}

## Rotate Selection Tool

Rotate selected keys around anchor points (key corners and centers) using the **Rotate Selection** tool (<kbd>Shift</kbd>+<kbd>R</kbd>).

![Rotate tool animation](/rotate-tool.gif)

## Mirror Tool

Create mirrored copies of selected keys with the **Mirror Tool**. Choose a mirror axis position — the axis snaps to multiples of the step size. Supports both vertical (default) and horizontal mirroring from the tool dropdown.

![Mirror tool animation](/mirror-tool.gif)

## Extra Tools {#extra-tools}

Extra tools are grouped under a single button in the left toolbar. There are four:

1. **Legend Tools** — bulk legend editing
2. **Add Switch Matrix Coordinates** — assign VIA-style row/column labels
3. **Move Rotation Origins** — recalculate positions with new rotation references
4. **Theme Tools** — apply color themes to the layout

### Legend Tools

Legend tools provide quick canvas-oriented label editing in four modes:

| Mode | Description |
|------|-------------|
| **Edit** | Direct label assignment with auto-advancement to next key after <kbd>Enter</kbd> |
| **Remove** | Remove all labels at the selected label position |
| **Align** | Change label alignment |
| **Move** | Move labels from one position to another |

| Edit Mode | Move Mode |
|:---:|:---:|
| ![Legend tools edit](/legend-tools-edit.gif) | ![Legend tools move](/legend-tools-move.gif) |

> **Tip:** Legend Tools are designed for easier bulk label editing compared to modifying labels one at a time in the Key Properties panel.

### Add Switch Matrix Coordinates

This tool assigns VIA-style `row,column` labels (e.g., `0,0`) to each key, enabling compatibility with [VIA](https://www.caniusevia.com/) and [Vial](https://get.vial.today/) configurators and the [PCB Generator](./pcb-generator).

![Matrix coordinates modal](/add-switch-matrix-coordinates-modal.png){.docs-screenshot}

The tool provides an **Annotate Automatically** option that assigns coordinates intelligently based on key positions. You can also draw rows and columns manually:

| Draw Rows | Draw Columns | Remove |
|:---:|:---:|:---:|
| ![Draw rows](/manual-annotation-draw-row.gif) | ![Draw columns](/manual-annotation-draw-columns.gif) | ![Remove](/manual-annotation-remove-elements.gif) |

- Left-click to start and complete wire segments
- Right-click or <kbd>Escape</kbd> to cancel
- Click an existing wire to append to it
- Hold <kbd>Ctrl</kbd> while clicking a wire to remove the entire row/column

To renumber a row or column: hover over it in any editing mode and type the new number.

> **Note:** To export a PNG with the matrix wire overlay visible, open the **Add Switch Matrix Coordinates** tool first, then use **Export → Download PNG**.

## Image and SVG Labels

Key labels support embedding images and SVG graphics. Images align to the inner keycap surface (the visible face of the key, excluding the border).

### External Image URL

```json
[[ {"a":7}, "<img src='https://example.com/icon.png' width=32 height=32>" ]]
```

- The image server must support CORS
- Tested formats: PNG, SVG

### Inline SVG

```json
[[ {"a":7}, "<svg width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"12\" fill=\"#FF5722\"/></svg>" ]]
```

- SVG must include explicit `width` and `height` attributes

### Cross-Instance Copy & Paste

Keys can be copied in one browser tab/window and pasted into another KLE-NG instance. This works across different editor sessions.

### Export Resolution

Zoom in on the canvas before exporting to PNG to increase the output image resolution.
