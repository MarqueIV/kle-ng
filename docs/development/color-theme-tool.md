# Color Theme Tool

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Data Model](#data-model)
  - [Theme](#theme)
  - [ThemeRule](#themerule)
  - [ThemeColorAssignment](#themecolorassignment)
- [Matcher Expression DSL](#matcher-expression-dsl)
  - [Grammar](#grammar)
  - [Numeric Properties](#numeric-properties)
  - [Boolean Flags](#boolean-flags)
  - [Label Checks](#label-checks)
  - [Logic Operators](#logic-operators)
  - [Examples](#examples)
- [Rule Evaluation](#rule-evaluation)
- [Built-in Themes](#built-in-themes)
- [Store API](#store-api)
- [UI Panel](#ui-panel)
  - [Theme Selection](#theme-selection)
  - [JSON Editor](#json-editor)
  - [Color Calculator](#color-calculator)
  - [File Import / Export](#file-import--export)
- [Applying a Theme](#applying-a-theme)
- [Undo / Redo Integration](#undo--redo-integration)
- [Color Utilities](#color-utilities)

---

## Overview

The color theme tool lets users apply coordinated color schemes to an entire keyboard layout in a single action. A theme consists of an ordered list of rules; each rule pairs a **matcher expression** (which selects keys by their properties) with a set of color assignments. Rules are applied in order with last-match-wins semantics so that a generic "all keys" default can be overridden by progressively more specific rules.

Themes can be selected from four built-in presets, edited as JSON directly in the panel, or loaded from external `.json` files.

---

## Architecture

```
src/
├── types/
│   └── theme.ts                  # Theme, ThemeRule, ThemeColorAssignment interfaces
├── data/
│   └── builtinThemes.ts          # Four preset theme definitions
├── stores/
│   └── themeTools.ts             # Pinia store — state, actions, apply logic
├── utils/
│   ├── theme-engine.ts           # Rule evaluation and key color assignment
│   ├── matcher-parser.ts         # Matcher expression tokenizer, parser, evaluator
│   └── color-utils.ts            # HSV/RGB/HEX conversions, CIE Lab lightening
└── components/
    └── ThemeToolsPanel.vue       # Draggable panel — full theme tool UI
```

---

## Data Model

### Theme

```typescript
interface Theme {
  name: string // Display name, also used as export filename
  backgroundColor?: string // Keyboard background color (6-digit hex, e.g. "#eeeeee")
  rules: ThemeRule[] // Ordered rules; last match wins
}
```

### ThemeRule

```typescript
interface ThemeRule {
  name: string // Human-readable label (shown in help, useful for debugging)
  matchers?: string // Matcher expression string; omit or leave empty to match all keys
  colors: ThemeColorAssignment
}
```

A rule with no `matchers` field (or an empty/whitespace string) matches every key and is used as the fallback default.

### ThemeColorAssignment

```typescript
interface ThemeColorAssignment {
  color?: string // Keycap background color (hex)
  defaultTextColor?: string // Default label color for all positions
  textColors?: Partial<Record<number, string>> // Per-position overrides (positions 0–11)
}
```

Color values are 6-digit hex strings (e.g. `"#cccccc"`). `textColors` keys are label position indices following the KLE serial format (0–11).

**Example theme JSON:**

```json
{
  "name": "My Theme",
  "backgroundColor": "#1e1e1e",
  "rules": [
    {
      "name": "Default",
      "colors": {
        "color": "#3c3c3c",
        "defaultTextColor": "#d4d4d4"
      }
    },
    {
      "name": "Modifiers",
      "matchers": "width > 1 or height > 1",
      "colors": {
        "color": "#252526",
        "defaultTextColor": "#cccccc"
      }
    },
    {
      "name": "Escape",
      "matchers": "label == \"Esc\"",
      "colors": {
        "color": "#8b0000",
        "defaultTextColor": "#ffffff"
      }
    }
  ]
}
```

---

## Matcher Expression DSL

Matchers are small boolean expressions that are evaluated against each key's properties.

### Grammar

```
expr        = or_expr
or_expr     = and_expr  ("or"  and_expr)*
and_expr    = not_expr  ("and" not_expr)*
not_expr    = "not" not_expr | primary
primary     = "(" expr ")"
            | <flag>
            | <numeric_prop> <cmp_op> <number>
            | "label" ["[" <int> "]"] <label_op> <string>
```

### Numeric Properties

| Property   | Description                     |
| ---------- | ------------------------------- |
| `width`    | Key width in keyboard units     |
| `height`   | Key height in keyboard units    |
| `x`        | Key X position (keyboard units) |
| `y`        | Key Y position (keyboard units) |
| `rotation` | Key rotation angle in degrees   |

Comparison operators: `==`, `!=`, `<>`, `<`, `<=`, `>`, `>=`

### Boolean Flags

| Flag      | Description                    |
| --------- | ------------------------------ |
| `decal`   | Key is a decorative decal      |
| `ghost`   | Key is a ghost/transparent key |
| `stepped` | Key has a stepped profile      |
| `nub`     | Key has a homing nub           |

Flags are used as standalone terms — no operator or value needed.

### Label Checks

| Operator   | Meaning                          |
| ---------- | -------------------------------- |
| `==`       | Label equals value (exact match) |
| `!=`       | No label position equals value   |
| `contains` | Label contains substring         |
| `matches`  | Label matches regular expression |

`label` without an index checks **all 12 positions** (0–11). Use `label[n]` to check a specific position.

```
label == "Enter"          // any position equals "Enter"
label[0] == "Esc"         // top-left legend equals "Esc"
label contains "Fn"       // any legend contains "Fn"
label matches "^F[0-9]+"  // any legend matches regex
```

### Logic Operators

| Operator | Description                |
| -------- | -------------------------- |
| `and`    | Both sub-expressions true  |
| `or`     | Either sub-expression true |
| `not`    | Negates the sub-expression |

Parentheses `()` group sub-expressions for explicit precedence.

### Examples

```
width >= 4                            // spacebar-sized keys
width > 1 or height > 1              // any non-1u key
label == "Enter" and height == 1     // standard enter (not ISO)
not decal                            // all real keys (no decals)
rotation != 0                        // any rotated key
label[0] == "Esc" or label[0] == "~" // Escape / backtick key
width == 2.25 and height == 1        // left shift (ANSI)
```

---

## Rule Evaluation

Rule evaluation is implemented in `src/utils/theme-engine.ts`.

**Algorithm:**

1. For each key, iterate through all `rules` in order.
2. For each rule, evaluate the `matchers` expression against the key.
   - An empty/missing matcher always returns `true`.
3. If the rule matches, merge its `colors` into the running assignment:
   - `color` and `defaultTextColor` are overwritten (last match wins).
   - `textColors` entries are merged by position (later rules win per-position).
4. After all rules are processed, apply the final merged `ThemeColorAssignment` to the key.

Parsed matcher expressions are **cached by string** to avoid repeated parsing when the same expression is evaluated for many keys.

---

## Built-in Themes

Four presets are defined in `src/data/builtinThemes.ts`:

| Name             | Description                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **Classic**      | Light gray background, medium gray keycaps, black text. Single default rule.               |
| **Dark**         | Near-black background, dark gray keycaps, light gray text.                                 |
| **VIA**          | Light theme with modifier and accent rules based on key size.                              |
| **Gruvbox Dark** | Gruvbox color palette with 8 rules, including label-based text coloring for function keys. |

---

## Store API

`useThemeToolsStore` (Pinia) manages all theme state.

**State / Computed:**

| Name                 | Type             | Description                                |
| -------------------- | ---------------- | ------------------------------------------ |
| `activeBuiltinIndex` | `number \| null` | Index into `builtinThemes`, or `null`      |
| `customTheme`        | `Theme \| null`  | User-loaded custom theme                   |
| `currentTheme`       | `Theme \| null`  | Active theme (custom if set, else builtin) |
| `isCustomTheme`      | `boolean`        | Whether a custom theme is currently active |

**Actions:**

| Action                      | Description                                                   |
| --------------------------- | ------------------------------------------------------------- |
| `selectBuiltinTheme(index)` | Switch to a builtin preset; clears custom theme               |
| `loadCustomTheme(theme)`    | Set a custom `Theme` object; clears builtin selection         |
| `parseThemeJson(json)`      | Validate and parse a JSON string; returns `Theme` or throws   |
| `applyTheme()`              | Apply `currentTheme` to all keys; saves an undo history entry |
| `exportThemeJson()`         | Return current theme as formatted JSON string                 |

---

## UI Panel

`ThemeToolsPanel.vue` is a draggable overlay panel opened from the canvas toolbar. Default position is near the top-right of the viewport.

### Theme Selection

A dropdown lists the four built-in presets. When a custom theme has been loaded it appears in the dropdown as its own name (with a `(custom)` indicator). Switching presets immediately updates the JSON editor.

### JSON Editor

A CodeMirror editor displays the active theme as formatted JSON. Edits are validated in real-time; errors appear below the editor. The editor color scheme tracks the site's light/dark mode automatically.

### Color Calculator

A bidirectional tool for converting between:

- **KLE key color** — the value stored in the layout (keycap body color)
- **Key-top appearance** — the lighter visual color seen on screen

The conversion uses CIE Lab color space: key-top L\* = KLE L\* × 1.2. The reverse divides by 1.2. A warning is shown if the resulting L\* would exceed 100 (clamping applies).

### File Import / Export

- **Load JSON** — opens a file picker, reads the selected `.json` file, validates the schema, and sets it as the active custom theme. Errors are displayed inline.
- **Save JSON** — downloads the current theme as `{name}.json`.

---

## Applying a Theme

When **Apply Theme** is clicked:

1. `themeStore.applyTheme()` iterates every key in `keyboardStore.keys`.
2. `evaluateThemeForKey(key, theme)` runs the rule cascade and returns a merged `ThemeColorAssignment`.
3. `applyAssignmentToKey(key, assignment)` writes colors to the key object:
   - `key.color` ← `assignment.color`
   - `key.default.textColor` ← `assignment.defaultTextColor`
   - `key.textColor[i]` ← `assignment.textColors[i]` for each position
4. If `theme.backgroundColor` is set, `metadata.backcolor` is updated.
5. `keyboardStore.saveState()` is called (in a `try/finally`) to commit a single undo entry.

The Apply button is disabled when no theme is selected.

---

## Undo / Redo Integration

Theme application is **atomic**: a single Undo operation reverts color changes to every affected key simultaneously. This is achieved by calling `keyboardStore.saveState()` once after all keys have been updated, which pushes a complete deep-copy snapshot of `keys` and `metadata` into the 50-entry history buffer.

---

## Color Utilities

`src/utils/color-utils.ts` provides the following exports:

| Function                             | Description                                                   |
| ------------------------------------ | ------------------------------------------------------------- |
| `hsvToRgb(h, s, v)`                  | HSV → RGB (h: 0–360, s/v: 0–100)                              |
| `rgbToHsv(r, g, b)`                  | RGB → HSV                                                     |
| `hexToRgb(hex)`                      | Hex string → `{r, g, b}`                                      |
| `rgbToHex(r, g, b)`                  | RGB → 6-digit hex string                                      |
| `hexToHsv(hex)` / `hsvToHex(...)`    | Shorthand conversions                                         |
| `isValidHex(hex)`                    | Validates 6-digit or 8-digit hex                              |
| `hexToAlpha(hex)`                    | Extract alpha byte from 8-digit hex                           |
| `hexWithAlpha(hex6, alpha)`          | Combine 6-digit hex with alpha byte                           |
| `normalizeHex(hex)`                  | Ensures `#` prefix                                            |
| `lightenColor(color, factor?)`       | CIE Lab lightening — multiplies L\* by `factor` (default 1.2) |
| `invertLightenColor(color, factor?)` | Inverse — divides L\* by `factor`                             |
