# Plate Generator

The Plate Generator converts a KLE keyboard layout into a mechanical keyboard mounting plate design,
producing switch and stabilizer cutouts positioned to match the layout.
It exports to SVG and DXF formats for use in manufacturing workflows (laser cutting, CNC machining, etc.).

## Architecture Overview

```
PlateGeneratorPanel.vue            ← Entry point, 2-column layout
├── PlateGeneratorSettings.vue     ← Cutout type, fillet, kerf, custom dimensions
├── PlateGeneratorControls.vue     ← Generate button, auto-refresh toggle
├── PlateGeneratorResults.vue      ← SVG preview display
└── PlateDownloadButtons.vue       ← SVG / DXF download

stores/plateGenerator.ts           ← State management (Pinia)
utils/plate/plate-builder.ts       ← Orchestrates geometry → export
utils/plate/cutout-generator.ts    ← Switch & stabilizer cutout shapes
utils/makerjs-loader.ts            ← Lazy-loads maker.js library
utils/keyboard-geometry.ts         ← Key center position math
utils/decimal-math.ts              ← Precision decimal arithmetic
types/plate.ts                     ← Type definitions
```

## Data Flow

```
┌──────────────────────────┐
│  User changes settings   │
│  or clicks "Generate"    │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│  plateGeneratorStore     │
│  .generatePlate()        │
│  Status: loading →       │
│  generating → success    │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐    ┌───────────────────────────┐
│  buildPlate()            │◄───│  keyboardStore            │
│  plate-builder.ts        │    │  (keys, spacing metadata) │
└────────────┬─────────────┘    └───────────────────────────┘
             ▼
┌──────────────────────────┐
│  For each valid key:     │
│  1. Compute position     │
│  2. Create switch cutout │
│  3. Create stab cutout   │
│  4. Apply transforms     │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│  maker.js exports        │
│  → SVG preview (HTML)    │
│  → SVG download (mm)     │
│  → DXF content           │
└──────────────────────────┘
```

### Auto-Refresh

When auto-refresh is enabled, the keyboard store calls `plateGeneratorStore.requestRegenerate()` whenever the layout
changes (key edits, undo, redo). This is debounced at 500ms and only fires when settings pass validation.

## File Reference

### Components

| File                         | Purpose                                                                                                                                                                   |
|------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `PlateGeneratorPanel.vue`    | Root container. Two-column layout (controls left, preview right). Preloads maker.js on mount via `requestIdleCallback`.                                                   |
| `PlateGeneratorSettings.vue` | Form controls for cutout type, stabilizer type, fillet radius, size adjustment, custom dimensions, and merge cutouts toggle. Validates inputs and displays inline errors. |
| `PlateGeneratorControls.vue` | "Generate Plate" button with loading state, auto-refresh checkbox, error alerts, and empty-layout warnings.                                                               |
| `PlateGeneratorResults.vue`  | Renders the SVG preview on success, a spinner during generation, or idle instructions before first generation.                                                            |
| `PlateDownloadButtons.vue`   | SVG and DXF download buttons, visible only after successful generation. Creates blobs and triggers browser downloads.                                                     |

### Store

**`stores/plateGenerator.ts`** — Pinia store managing all plate generator state.

**State:**
- `settings: PlateSettings` — Current configuration (cutout type, stabilizer type, fillet radii, size adjust, custom dimensions, merge cutouts).
- `autoRefresh: boolean` — Whether to regenerate on layout changes.
- `generationState: GenerationState` — Status (`idle` | `loading` | `generating` | `success` | `error`), result, and error message.

**Actions:**
- `generatePlate()` — Reads keys and spacing from the keyboard store, calls `buildPlate()`, and updates `generationState` with the result.
- `downloadSvg()` / `downloadDxf()` — Extract the appropriate content from the generation result and trigger a browser download (`keyboard-plate.svg` / `keyboard-plate.dxf`).
- `requestRegenerate()` — Debounced (500ms) regeneration triggered by layout changes when auto-refresh is on.
- `resetGeneration()` — Returns `generationState` to idle.

**Persistence:**
Settings and auto-refresh state are saved to `localStorage` under key `kle-ng-plate-settings`, debounced at 500ms on change.

### Utilities

#### `plate/plate-builder.ts`

Main orchestration module. `buildPlate(keys, options)` is the entry point.

1. **Filter keys** — Excludes decal and ghost keys, sorts by position.
2. **Transform coordinates** — Converts KLE layout coordinates to maker.js coordinates (see Coordinate System below).
3. **Create cutouts** — For each key, creates a switch cutout model and optionally a stabilizer model.
4. **Merge cutouts** (optional) — When `mergeCutouts` is enabled, combines overlapping cutouts into simplified paths.
5. **Export** — Uses maker.js to produce SVG (preview and download variants) and DXF output.

The preview SVG includes an origin crosshair (red line) and 1mm padding. The download SVG uses black strokes and mm units. DXF output uses POLYLINE entities.

**Merge Cutouts:**

The `mergeOverlappingCutouts()` helper function uses the maker.js `combineUnion` API to merge overlapping cutout geometry:

1. Clones the first cutout model as the merge base.
2. Iteratively combines each subsequent model using `makerjs.model.combineUnion()`.
3. After each union operation, collects the resulting paths from both models.
4. Returns a single merged model containing the simplified union of all cutouts.

This is particularly useful when stabilizer cutouts overlap with switch cutouts, as merging produces cleaner paths for manufacturing. Without merging, overlapping shapes may contain internal edges that can cause issues with some CAD/CAM software or laser cutting workflows.

#### `plate/cutout-generator.ts`

Generates individual cutout shapes and handles validation.

**Switch cutout dimensions:**

| Type               | Width (mm)   | Height (mm)  |
|--------------------|--------------|--------------|
| Cherry MX Basic    | 14.0         | 14.0         |
| Alps SKCM/L        | 15.5         | 12.8         |
| Alps SKCP          | 16.0         | 16.0         |
| Kailh Choc CPG1350 | 14.0         | 14.0         |
| Kailh Choc CPG1232 | 13.7         | 12.7         |
| Custom Rectangle   | User-defined | User-defined |

**Stabilizer types:**

- **MX Basic** — Simple 7mm x 15mm rectangular cutout pair, positioned symmetrically. Max fillet radius: 3.5mm.
- **MX Spec** — Spec-accurate Cherry MX stabilizer with side notches and wire channel geometry. Max fillet radius: 0.4mm.
- **MX Spec Narrow** — Same as MX Spec but with a narrower wire channel, provides more stable switch placement
- **None** — No stabilizer cutouts.

**Stabilizer spacing by key size:**

| Key Size | Spacing (mm) |
|----------|--------------|
| 2U       | 11.938       |
| 3U       | 19.05        |
| 4U       | 28.575       |
| 4.5U     | 34.671       |
| 5.5U     | 42.863       |
| 6U       | 47.625       |
| 6.25U    | 50.0         |
| 6.5U     | 52.375       |
| 7U       | 57.15        |
| 8U       | 66.675       |

For vertical keys (height > width), the stabilizer pair is rotated -90 degrees.

**Validation functions:**
- `validateFilletRadius()` — Ensures radius does not exceed `min(width, height) / 2`.
- `validateStabilizerFilletRadius()` — Checks against the per-type maximum.
- `validateSizeAdjust()` — Ensures cutout dimensions remain positive after adjustment.
- `validateCustomCutoutDimension()` — Validates custom width/height bounds.

**Size adjustment (kerf compensation):**
The `sizeAdjust` value is subtracted from each side of the cutout: `effectiveSize = originalSize - (sizeAdjust * 2)`.
Positive values shrink cutouts (compensating for kerf in laser cutting), negative values expand them.

**Merge Cutouts setting:**
When `mergeCutouts` is enabled in `PlateSettings`, overlapping cutout shapes are combined into unified paths using boolean union operations. This setting defaults to `false` and is controlled via a checkbox in the settings panel.

| Setting        | Default | Description                                           |
|----------------|---------|-------------------------------------------------------|
| `mergeCutouts` | `false` | Combine overlapping cutouts into simplified outlines. |

**When to use merge cutouts:**
- Exporting to CAD/CAM software that handles overlapping paths poorly
- Producing cleaner DXF files for CNC machining

**Trade-offs:**
- Merging adds processing time, especially for large layouts
- The merged output loses the distinction between individual cutout types
- Some minor path simplification may occur at intersection points

#### `makerjs-loader.ts`

Lazy-loads the [maker.js](https://maker.js.org/) library to keep the initial bundle small.

- `preloadMakerJsModule()` — Triggers a background import during browser idle time (`requestIdleCallback`, falls back to `setTimeout(100ms)`). Called on `PlateGeneratorPanel` mount.
- `getMakerJs()` — Returns a cached promise for the module. First call triggers the import with a 30-second timeout.
- `isMakerJsLoaded()` — Synchronous check for whether the module is already cached.

#### `keyboard-geometry.ts`

- `getKeyCenter(key)` — Computes the center point of a key in layout units, accounting for rotation origin (`rotation_x`, `rotation_y`).
- `getKeyDistance(key1, key2)` — Euclidean distance between two key centers.

#### `decimal-math.ts`

Exported as `D`. Wraps arithmetic operations in a `Decimal` library to avoid floating-point errors in position and dimension calculations. Provides `add`, `sub`, `mul`, `div`, `rotatePoint`, `mirrorPoint`, trigonometric functions, and formatting.

## Coordinate System

The plate builder transforms between two coordinate systems:

| Property | KLE (input)        | Maker.js (output)          |
|----------|--------------------|----------------------------|
| Origin   | Top-left           | First key center           |
| Y axis   | +Y down            | +Y up                      |
| Rotation | Clockwise positive | Counter-clockwise positive |

**Transformation for each key:**
1. Compute center in KLE layout units using `getKeyCenter()`.
2. Use the first valid key's center as the origin reference.
3. X position: `(key.centerX - origin.centerX) * spacingX`
4. Y position: `(origin.centerY - key.centerY) * spacingY` (inverted)
5. Rotation angle: negated from KLE value.

Default spacing is 19.05mm on both axes, overridden by keyboard metadata (`spacing_x`, `spacing_y`) when present.

## Integration with Keyboard Store

The plate generator depends on `stores/keyboard.ts` for:

- **Keys array** — The set of keys in the current layout, used as input to `buildPlate()`.
- **Metadata** — `spacing_x` and `spacing_y` values for unit-to-mm conversion.
- **Change notifications** — The keyboard store calls `plateGeneratorStore.requestRegenerate()` after `saveState()`, `undo()`, and `redo()` to trigger auto-refresh.

The `PlateGeneratorControls` component also checks `keyboardStore.keys.length` to warn about empty layouts and disable the generate button.

## Exports

Two export formats are produced:

- **SVG** — Vector format with millimeter units. Suitable for direct use in laser cutting software or vector editors.
- **DXF** — CAD exchange format using POLYLINE entities. Compatible with most CAD/CAM software.

Download filenames are `keyboard-plate.svg` and `keyboard-plate.dxf`. Files are created as in-memory blobs and downloaded via a temporary anchor element.
