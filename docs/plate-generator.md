# Plate Generator

The Plate Generator converts a KLE keyboard layout into a mechanical keyboard mounting plate design,
producing switch and stabilizer cutouts positioned to match the layout.
It exports to SVG, DXF, STL, and JSCAD formats for use in manufacturing workflows (laser cutting, CNC machining, 3D printing, etc.).

## Architecture Overview

```
PlateGeneratorPanel.vue            ← Entry point, tabbed 2-column layout
├── PlateGeneratorSettings.vue     ← [Cutouts tab] Switch/stab type, fillet, kerf
├── PlateHolesSettings.vue         ← [Holes tab] Corner mounting holes
├── PlateOutlineSettings.vue       ← [Outline tab] Outline margins, fillets, thickness
├── PlateGeneratorControls.vue     ← Generate button, auto-refresh toggle
├── PlateGeneratorResults.vue      ← 2D SVG preview / 3D preview tab switcher
│   └── Plate3DPreview.vue         ← Interactive Three.js WebGL 3D viewer
└── PlateDownloadButtons.vue       ← SVG / DXF / STL / JSCAD download

stores/plateGenerator.ts           ← State management (Pinia)
utils/plate/plate-worker.ts        ← Web Worker running buildPlate() off main thread
utils/plate/plate-builder.ts       ← Orchestrates geometry → export
utils/plate/cutout-generator.ts    ← Switch & stabilizer cutout shapes
utils/makerjs-loader.ts            ← Lazy-loads maker.js library
utils/three-loader.ts              ← Lazy-loads Three.js + STLLoader + OrbitControls
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
│  1. Check cache (hit?) ───────► Instant result, skip worker
│  2. Check in-flight?   ───────► Set pendingRegeneration, return
│  Status: generating      │
└────────────┬─────────────┘
             │ postMessage (keys, options)
             ▼
┌──────────────────────────┐    ┌───────────────────────────┐
│  plate-worker.ts         │◄───│  keyboardStore            │
│  (Web Worker thread)     │    │  (keys, spacing metadata) │
│  calls buildPlate()      │    └───────────────────────────┘
│  plate-builder.ts        │
└────────────┬─────────────┘
             │ (worker thread)
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
│  Optional features:      │
│  • Merge cutouts         │
│  • Generate outline      │
│  • Add mounting holes    │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│  maker.js exports        │
│  → SVG preview (HTML)    │
│  → SVG download (mm)     │
│  → DXF content           │
│  → Merged exports (opt)  │
│  → JSCAD script (opt)    │
│  → STL content (opt)     │
└────────────┬─────────────┘
             │ postMessage (result)
             ▼
┌────────────────────────────┐
│  Store onmessage handler   │
│  1. Check generationId     │
│     (stale? discard)       │
│  2. Cache result           │
│  3. Status: success        │
│  4. If pendingRegeneration │
│     → re-enter generate    │
└────────────────────────────┘
```

### Auto-Refresh

When auto-refresh is enabled, the keyboard store calls `plateGeneratorStore.requestRegenerate()` whenever the layout
changes (key edits, undo, redo). This is debounced at 500ms and only fires when settings pass validation.

**Settings watcher:** A separate settings watcher (debounced at 300ms) calls `generatePlate()` whenever plate
settings change, provided the current status is `'success'` or `'generating'`. When called during `'generating'`
status, `generatePlate()` handles deferral internally via the `pendingRegeneration` flag rather than queueing
redundant work.

**Layout change handling:** `requestRegenerate()` clears the settings cache immediately (because cached results
are for the old layout). If generation is currently in-flight, it increments `generationId` to mark the in-flight
result as stale and sets `pendingRegeneration` so regeneration proceeds after the worker finishes. The debounced
500ms regeneration still fires as a backup path.

## File Reference

### Components

| File                         | Purpose                                                                                                                                                             |
|------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `PlateGeneratorPanel.vue`    | Root container. Tabbed two-column layout (controls left, preview right). Three tabs: Cutouts, Holes, Outline. Preloads maker.js and Three.js on mount via `requestIdleCallback`. |
| `PlateGeneratorSettings.vue` | [Cutouts tab] Form controls for cutout type, stabilizer type, fillet radius, size adjustment, custom dimensions, and merge cutouts toggle. Validates inputs.        |
| `PlateHolesSettings.vue`     | [Holes tab] Corner mounting holes (require outline) and custom holes at arbitrary positions with configurable diameter and X/Y offsets in keyboard units.           |
| `PlateOutlineSettings.vue`   | [Outline tab] Outline generation settings: enable toggle, outline type dropdown (None / Rectangular / Tight), per-mode margin controls, shared fillet radius, merge-with-cutouts option, and plate thickness for 3D export. |
| `PlateGeneratorControls.vue` | "Generate Plate" button with loading state, auto-refresh checkbox, error alerts, and empty-layout warnings.                                                         |
| `PlateGeneratorResults.vue`  | Segmented 2D/3D tab bar above the preview area. 2D tab renders the SVG preview (with dimmed previous result + spinner during regeneration). 3D tab hosts `Plate3DPreview`. Shows idle instructions before first generation. |
| `Plate3DPreview.vue`         | Interactive Three.js WebGL viewer for the generated STL. Lazy-loads Three.js on mount. Renders the plate mesh with `MeshPhongMaterial` colored by the active Bootstrap theme. Supports OrbitControls (click-to-activate, click-outside-to-deactivate). Reset view button restores the initial camera. Updates mesh and background colors when the website theme changes. Pauses the render loop when the 3D tab is hidden. |
| `PlateDownloadButtons.vue`   | SVG, DXF, STL, and JSCAD download buttons, visible only after successful generation. STL and JSCAD buttons appear only when outline is enabled (required for 3D export). Handles separate vs. merged SVG/DXF exports based on settings. |

### Store

**`stores/plateGenerator.ts`** — Pinia store managing all plate generator state.

**State:**
- `settings: PlateSettings` — Current configuration including cutouts, outline, mounting holes, and plate thickness settings.
- `autoRefresh: boolean` — Whether to regenerate on layout changes.
- `generationState: GenerationState` — Status (`idle` | `generating` | `success` | `error`), result, and error message.

Note: the `GenerationStatus` type definition still includes `'loading'` for backward compatibility, but the store never sets it. Components that check for `'loading'` do so defensively.

**Internal state (not exposed):**
- `worker: Worker | null` — Persistent Web Worker instance, created lazily on first `generatePlate()` call.
- `generationId: number` — Counter used to detect and discard stale worker responses. Incremented on cache hits and layout changes.
- `cache: Map<string, PlateGenerationResult>` — Cache of generated results keyed by JSON-stringified settings (not layout). Cleared on layout change.
- `pendingRegeneration: boolean` — Flag indicating that `generatePlate()` was called while a generation was already in-flight. Checked on worker completion to trigger a follow-up generation.

**Actions:**
- `generatePlate()` — Serializes current keys and settings, checks the cache, and dispatches work to a Web Worker. On cache hit, returns the cached result instantly and increments `generationId` to invalidate any in-flight worker response. On cache miss during an in-flight generation, sets `pendingRegeneration` and returns without queueing redundant work. On worker completion, caches the result and checks `pendingRegeneration` to re-enter if needed.
- `downloadSvg()` / `downloadDxf()` — Download cutouts only (`keyboard-plate.svg` / `keyboard-plate.dxf`).
- `downloadAllSvg()` — Downloads all SVG files. When `outline.mergeWithCutouts` is enabled, downloads a single merged file; otherwise downloads separate cutouts and outline files.
- `downloadAllDxf()` — Downloads all DXF files. Same merge logic as `downloadAllSvg()`.
- `downloadStl()` — Downloads the ASCII STL file (`keyboard-plate.stl`). Only available when outline is enabled.
- `downloadJscad()` — Downloads the JSCAD script (`keyboard-plate.jscad`). Only available when outline is enabled.
- `requestRegenerate()` — Clears the cache, marks any in-flight generation as stale (`++generationId`), sets `pendingRegeneration` if generating, then triggers debounced (500ms) regeneration when auto-refresh is on.
- `resetGeneration()` — Returns `generationState` to idle.

**Persistence:**
Settings are saved to `localStorage` under key `kle-ng-plate-settings`, debounced at 500ms on change. The store performs deep merging when loading settings and handles migration from older data structures.
`autoRefresh` is intentionally not saved. Some settings, such as certain cutout shapes or size adjustments (kerf), can cause slow plate generation; therefore, `autoRefresh` could unexpectedly
cause CPU usage spikes when the website is opened via a shared link.

### Utilities

#### `plate/plate-worker.ts`

Web Worker entry point. Receives `{ keys, options }` messages from the store, calls `buildPlate()`, and posts
back a `PlateWorkerResponse` (either `{ type: 'success', result }` or `{ type: 'error', message }`). Catches
`PlateBuilderError` for user-facing messages and handles maker.js timeout errors separately.

#### `plate/plate-builder.ts`

Main orchestration module. `buildPlate(keys, options)` is the entry point. Called by the Web Worker, not directly by the store.

1. **Filter keys** — Excludes decal and ghost keys, sorts by position.
2. **Transform coordinates** — Converts KLE layout coordinates to maker.js coordinates (see Coordinate System below).
3. **Create cutouts** — For each key, creates a switch cutout model and optionally a stabilizer model. Per-key `switchRotation` and `stabRotation` are applied on top of the layout rotation.
4. **Merge cutouts** (optional) — When `mergeCutouts` is enabled, combines overlapping cutouts into simplified paths.
5. **Create outline** (optional) — When `outline.enabled` is true, generates a rectangular outline with configurable margins and rounded corners.
6. **Add mounting holes** (optional) — When `mountingHoles.enabled` is true (and outline is enabled), adds circular holes at the four corners.
7. **Build 3D model** (optional) — When outline is enabled, clones a clean (layer-tag-free) version of the outline and cutout models into a combined `model3D`. This is done before layer-tagging so that path layers do not interfere with JSCAD chain containment checks.
8. **Export** — Uses maker.js to produce SVG (preview and download variants), DXF, and optionally JSCAD script and ASCII STL.

The preview SVG includes an origin crosshair (red line) and 1mm padding. Outline is rendered in blue (#0066cc). The download SVG uses black strokes and mm units. DXF output uses POLYLINE entities.

**3D Export (JSCAD / STL):**

When outline is enabled, `buildPlate()` produces two additional outputs using the `model3D` assembly (outline + cutouts extruded by the `thickness` setting):

- **JSCAD script** — Generated with `makerjs.exporter.toJscadScript(model3D, { extrude: thickness, units: 'mm' })`. Can be opened directly in [OpenJSCAD](https://openjscad.xyz/).
- **STL** — Generated with `makerjs.exporter.toJscadSTL(CAG, stlSerializer, model3D, { extrude: thickness, units: 'mm' })` using `@jscad/csg` and `@jscad/stl-serializer`. STL generation is wrapped in a try/catch; if it fails (e.g., in environments where `@jscad/csg` cannot run), a warning is logged and `stlData` is omitted from the result rather than failing the entire generation.

Both outputs are `undefined` when outline is disabled. The `thickness` option defaults to 1.5mm and is set via the Outline tab in the UI.

**Merge Cutouts:**

The `mergeOverlappingCutouts()` helper function uses the maker.js `combineUnion` API to merge overlapping cutout geometry:

1. Clones the first cutout model as the merge base.
2. Iteratively combines each subsequent model using `makerjs.model.combineUnion()`.
3. After each union operation, collects the resulting paths from both models.
4. Returns a single merged model containing the simplified union of all cutouts.

This is particularly useful when stabilizer cutouts overlap with switch cutouts, as merging produces cleaner paths for manufacturing. Without merging, overlapping shapes may contain internal edges that can cause issues with some CAD/CAM software or laser cutting workflows.

**Outline Generation:**

The `createOutlineModel()` function dispatches to one of two generators based on `outlineType`:

- **Rectangular** (`'rectangular'`): Creates a rectangle encompassing all cutouts plus the four configured directional margins. When `filletRadius > 0`, uses maker.js `RoundRectangle` for rounded corners; when `filletRadius = 0`, uses a standard `Rectangle` for sharp corners.
- **Tight** (`'tight'`): Calls `createTightOutlineModel(makerjs, cutoutPositions, outline.tightMargin)`, which computes an expanded hull around the key cluster. The hull is built by unioning expanded per-key shapes, then a fillet is applied to the result using `makerjs.chain.fillet(chain, outline.filletRadius)` on the chains found via `makerjs.model.findChains(outlineModel)`. Unlike the rectangular path, the fillet clips existing paths in-place and inserts new arc paths into the outline. The minimum allowed `tightMargin` is 0.5mm.

**Corner Mounting Holes:**

The `createCornerMountingHoles()` function adds mounting holes:

- Creates 4 circular holes using maker.js `Ellipse` models.
- Holes are positioned at `edgeDistance` from each corner of the outline.
- Requires outline to be enabled (holes need outline bounds for positioning).

#### `plate/cutout-generator.ts`

Generates individual cutout shapes and handles validation.

**Switch cutout dimensions:**

| Type               | Width (mm)       | Height (mm)  |
|--------------------|------------------|--------------|
| Cherry MX Basic    | 14.0             | 14.0         |
| Cherry MX Openable | 14.0 + (2 * 0.8) | 14.0         |
| Alps SKCM/L        | 15.5             | 12.8         |
| Alps SKCP          | 16.0             | 16.0         |
| Kailh Choc CPG1350 | 14.0             | 14.0         |
| Kailh Choc CPG1232 | 13.7             | 12.7         |
| Custom Rectangle   | User-defined     | User-defined |

**Cherry MX Openable:**

The Openable cutout is a 14x14mm base with 4 symmetrical notches on the left and right edges. These notches allow the switch top housing to be opened for maintenance (e.g., spring/stem swap, lubing) without desoldering.

- Notch width: 0.8mm (extends outward from each side edge)
- Notch height: 3.1mm
- Notch center offset: 4.45mm from cutout center (8.9mm between top and bottom notch centers)
- Max fillet radius: 0.4mm (limited by notch width)

**Stabilizer types:**

- **MX Basic** — Simple 7mm x 15mm rectangular cutout pair. Unidirectional, matching stabilizer orientation required. Max fillet radius: 3.5mm.
- **MX Bidirectional** — Simple 7mm x 18mm rectangular cutout pair. Supports both stabilizer orientations.
- **MX Tight** — Simple 6.75mm x 14mm rectangular cutout pair, may not fit with third party stabilizers. Max fillet radius: 3.375mm.
- **MX Spec** — Spec-accurate Cherry MX stabilizer with side notches and wire channel geometry. Max fillet radius: 0.4mm.
- **MX Spec Narrow** — Same as MX Spec but with a narrower wire channel, provides more stable switch placement.
- **None** — No stabilizer cutouts.

**Stabilizer spacing by key size:**

| Key Size | Cherry MX Spacing (mm) | Alps Spacing (mm)    |
|----------|------------------------|----------------------|
| 1.75U    | -                      | 12                   |
| 2U       | 11.938                 | 14                   |
| 2.75     | 11.938                 | 14 (AT101: 20.5)     |
| 3U       | 19.05                  | -                    |
| 6U       | 47.625                 | -                    |
| 6.25U    | 50.0                   | 41.86                |
| 6.5U     | 52.375                 | 45.3                 |
| 7U       | 57.15                  | -                    |
| 8U       | 66.675                 | -                    |

For vertical keys (height > width), the stabilizer pair is rotated -90 degrees.

**Per-key rotation overrides (`switchRotation` / `stabRotation`):**

Each key can carry optional `switchRotation` and `stabRotation` properties (set in the Manufacturing section of
`KeyPropertiesPanel`). These rotate the switch cutout or stabilizer cutout independently around the key center,
on top of the layout rotation (`rotation_angle`). Values use KLE convention (clockwise positive, in 90° increments)
and are negated internally for maker.js (counter-clockwise positive).

- **`switchRotation`** — Applied inside `positionCutout()`. Combined with the layout rotation into a single rotation
  before the cutout is moved to its final position: `totalRotation = -(rotation_angle) - switchRotation`.
- **`stabRotation`** — Applied in `buildPlate()` when positioning the stabilizer model. Combined the same way:
  `totalStabRotation = -(rotation_angle) - stabRotation`.

**Validation functions:**
- `validateFilletRadius()` — Ensures radius does not exceed `min(width, height) / 2`.
- `validateStabilizerFilletRadius()` — Checks against the per-type maximum.
- `validateCustomCutoutDimension()` — Validates custom width/height are between 0 and 50mm.

**Size adjustment (kerf compensation):**
The `sizeAdjust` value represents the total kerf width — the full width of material removed by the cutting tool.
Each side of the cutout shrinks by half the kerf: `effectiveSize = originalSize - sizeAdjust`.
For example, a 14mm cutout with `sizeAdjust = 0.5` is drawn at 13.5mm (0.25mm removed per side);
the cutting tool then removes 0.25mm on each side, producing a 14mm hole.
Positive values shrink cutouts (compensating for kerf in laser cutting), negative values expand them.

**Merge Cutouts setting:**
When `mergeCutouts` is enabled in `PlateSettings`, overlapping cutout shapes are combined into unified paths using boolean union operations.

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

#### `three-loader.ts`

Lazy-loads Three.js and its add-ons to keep the initial bundle small. Follows the same pattern as `makerjs-loader.ts`: singleton module cache, shared in-flight promise, and a 30-second timeout. Clearing the in-flight promise on failure allows the import to be retried.

Exports a `ThreeModules` interface containing `THREE`, `STLLoader`, and `OrbitControls`.

- `preloadThreeModule()` — Triggers a background import during browser idle time (`requestIdleCallback`, falls back to `setTimeout(100ms)`). Called on `PlateGeneratorPanel` mount alongside `preloadMakerJsModule()`.
- `getThree()` — Returns a cached promise for `{ THREE, STLLoader, OrbitControls }`. First call triggers the parallel import of `three`, `three/examples/jsm/loaders/STLLoader.js`, and `three/examples/jsm/controls/OrbitControls.js`.
- `isThreeLoaded()` — Synchronous check for whether the modules are already cached.

#### `keyboard-geometry.ts`

- `getKeyCenter(key)` — Computes the center point of a key in layout units, accounting for rotation origin (`rotation_x`, `rotation_y`).
- `getKeyDistance(key1, key2)` — Euclidean distance between two key centers.

#### `decimal-math.ts`

Exported as `D`. Wraps arithmetic operations in a `Decimal` library to avoid floating-point errors in position and dimension calculations. Provides `add`, `sub`, `mul`, `div`, `rotatePoint`, `mirrorPoint`, trigonometric functions, and formatting.

## Worker, Cache & Deferred Regeneration

### Web Worker

Plate generation runs off the main thread in a Web Worker (`utils/plate/plate-worker.ts`). The worker calls
`buildPlate()` with the provided keys and options, then posts back either a success response containing the
`PlateGenerationResult` or an error response with a message string.

- **Lazy creation:** The worker is instantiated on the first call to `generatePlate()`, not on store creation or panel mount.
- **Reused across generations:** The same worker instance handles all subsequent generations. It is never terminated between runs.
- **Serialization:** Keys and options are serialized via `JSON.parse(JSON.stringify(...))` before `postMessage` to strip Vue Proxy wrappers that `structuredClone` (used internally by `postMessage`) cannot handle.

The worker imports `buildPlate` and `PlateBuilderError` from `plate-builder.ts`. It catches `PlateBuilderError` for user-facing messages and surfaces timeout errors from the maker.js loader separately.

### Cache

A `Map<string, PlateGenerationResult>` caches previously generated results. The cache key is the JSON-stringified
settings object (cutout type, stabilizer type, fillet radii, size adjust, outline, holes, spacing) -- it does **not**
include the layout keys. This means the cache is only valid for the current layout.

- **Cache hit:** Returns instantly. Increments `generationId` to invalidate any in-flight worker response, since the
  result is already available.
- **Cache miss:** Proceeds to dispatch work to the Web Worker.
- **Invalidation:** The entire cache is cleared by `requestRegenerate()` whenever the layout changes. Since the cache
  key does not include layout data, all entries become stale on layout change.

### Deferred Regeneration

When `generatePlate()` is called while a generation is already in-flight (status is `'generating'` and the call
is a cache miss), it sets the `pendingRegeneration` flag and returns immediately instead of posting a second
message to the worker. Multiple mid-flight calls collapse into a single deferred generation.

On worker completion (`onmessage` or `onerror`), the store checks `pendingRegeneration`. If set, it clears the
flag and calls `generatePlate()` again, which will pick up the latest reactive settings and keys.

This also applies to stale responses: when a worker response arrives with an outdated `generationId` (because a
cache hit or layout change incremented the counter), the response is not cached or displayed, but
`pendingRegeneration` is still checked. This ensures that a deferred layout-change regeneration can proceed even
when the in-flight result was marked stale.

### Stale Response Filtering

The `generationId` counter prevents stale worker responses from overwriting current state.

- **Incremented** in two places:
  - In `generatePlate()` when a cache hit occurs (the cached result is already applied, so any in-flight worker response for the same settings is redundant).
  - In `requestRegenerate()` when the layout changes during an in-flight generation (the in-flight result is for the old layout).
- **Checked** in the `onmessage` and `onerror` handlers: if `currentId !== generationId`, the response is discarded (not cached, not displayed). The handler still checks `pendingRegeneration` to allow deferred regeneration to proceed.

### Previous Result Preservation

When a new generation starts (cache miss, no in-flight work), the store preserves the previous `generationState.result`
while setting the status to `'generating'`. The `PlateGeneratorResults` component uses this to show the previous SVG
preview while the new result is being computed.

## Plate Outline

The plate outline feature generates a border around all cutouts, useful for defining the plate's outer boundary. Three outline types are available, selected via `OutlineSettings.outlineType`.

### Outline Types

**`none`** — No outline is generated. The plate contains only cutouts. 3D export (STL/JSCAD) is unavailable when no outline is selected.

**`rectangular`** — Generates an axis-aligned bounding box around all cutouts, expanded by four independent directional margins. This is the classic rectangular plate outline.

**`tight`** — Generates an expanded hull that follows the shape of the key cluster rather than a simple bounding box. The hull is computed from the switch cutout positions and expanded outward by a single uniform `tightMargin`. This produces a closer-fitting outline for non-rectangular layouts (e.g., split or ergonomic boards). Corner rounding via `filletRadius` is applied after the hull union is fully computed.

### Settings

| Setting             | Applies to          | Default | Description                                                               |
|---------------------|---------------------|---------|---------------------------------------------------------------------------|
| `enabled`           | all                 | `false` | Enable outline generation.                                                |
| `outlineType`       | all                 | `'rectangular'` | Outline shape: `'none'`, `'rectangular'`, or `'tight'`.           |
| `marginTop`         | `rectangular`       | `5`     | Distance from topmost cutout to top edge (mm).                            |
| `marginBottom`      | `rectangular`       | `5`     | Distance from bottommost cutout to bottom edge (mm).                      |
| `marginLeft`        | `rectangular`       | `5`     | Distance from leftmost cutout to left edge (mm).                          |
| `marginRight`       | `rectangular`       | `5`     | Distance from rightmost cutout to right edge (mm).                        |
| `tightMargin`       | `tight`             | `5`     | Uniform margin around the key cluster hull (mm). Minimum: 0.5mm.          |
| `filletRadius`      | `rectangular`, `tight` | `1` | Corner radius for rounded outline corners (mm). 0 = sharp. Shared by both non-none modes. |
| `mergeWithCutouts`  | all                 | `true`  | When downloading, combine outline and cutouts into one file.              |

The `thickness` setting lives on the top-level `PlateSettings` (not inside `OutlineSettings`) and is exposed in the Outline tab:

| Setting     | Default | Description                                              |
|-------------|---------|----------------------------------------------------------|
| `thickness` | `1.5`   | Plate thickness in mm used when extruding the 3D model.  |

### Merge With Cutouts

When `mergeWithCutouts` is enabled:
- `downloadAllSvg()` and `downloadAllDxf()` produce a single file containing both the outline and cutouts.
- The merged export simplifies the workflow for manufacturing.

When disabled:
- Downloads produce separate files for cutouts and outline.
- Useful when outline and cutouts need different processing (e.g., different cutting speeds).

## Corner Mounting Holes

The mounting holes feature adds circular holes at the four corners of the plate for screw mounting.

### Settings

| Setting        | Default | Description                                         |
|----------------|---------|-----------------------------------------------------|
| `enabled`      | `false` | Enable corner mounting holes.                       |
| `diameter`     | `3`     | Hole diameter (mm). Minimum: 0.5mm.                 |
| `edgeDistance` | `3`     | Distance from outline corner to hole center (mm).   |

### Dependencies

Mounting holes require the outline to be enabled. The holes are positioned relative to the outline corners, so without an outline there's no reference for hole placement. When outline is disabled, the mounting holes controls are automatically disabled in the UI.

## Custom Holes

The custom holes feature allows placing circular holes at arbitrary positions on the plate.

### Settings

| Setting    | Default | Description                                              |
|------------|---------|----------------------------------------------------------|
| `enabled`  | `false` | Enable custom holes.                                     |
| `holes`    | `[]`    | Array of hole definitions.                               |

Each hole definition has the following properties:

| Property   | Default | Description                                              |
|------------|---------|----------------------------------------------------------|
| `diameter` | `3`     | Hole diameter (mm). Minimum: 0.5mm.                      |
| `offsetX`  | `0`     | X offset from origin in keyboard units (U).              |
| `offsetY`  | `0`     | Y offset from origin in keyboard units (U).              |

### Usage

In the Holes tab, use the **Add** button to create new holes. Each hole appears in a scrollable list where you can configure its diameter and position. Use the **Remove All** button to clear all custom holes, or the × button on each row to remove individual holes.

### Coordinate System

Custom hole positions use keyboard units (U) relative to the origin (the center of the first key). Positive X moves right, positive Y moves down (matching KLE coordinates). The position is converted to millimeters using the keyboard's spacing settings (default: 19.05mm per unit).

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
5. Rotation angle: negated from KLE value. Per-key `switchRotation` and `stabRotation` are also negated and added to the layout rotation.

Default spacing is 19.05mm on both axes, overridden by keyboard metadata (`spacing_x`, `spacing_y`) when present.

## Integration with Keyboard Store

The plate generator depends on `stores/keyboard.ts` for:

- **Keys array** — The set of keys in the current layout, used as input to `buildPlate()`.
- **Metadata** — `spacing_x` and `spacing_y` values for unit-to-mm conversion.
- **Change notifications** — The keyboard store calls `plateGeneratorStore.requestRegenerate()` after `saveState()`, `undo()`, and `redo()` to trigger auto-refresh.

The `PlateGeneratorControls` component also checks `keyboardStore.keys.length` to warn about empty layouts and disable the generate button.

## Exports

### Export Formats

- **SVG** — Vector format with millimeter units. Suitable for direct use in laser cutting software or vector editors.
- **DXF** — CAD exchange format using POLYLINE entities. Compatible with most CAD/CAM software.
- **STL** — ASCII STL format. A solid 3D model of the plate (outline extruded by `thickness`, with cutouts subtracted). For use in 3D printing slicers or CAD tools. Only generated when outline is enabled.
- **JSCAD** — OpenJSCAD script that produces the same 3D solid as the STL. Can be opened in [OpenJSCAD](https://openjscad.xyz/) for further editing. Only generated when outline is enabled.

### Export Options

| Export Type        | Filename                    | Contents                                   |
|--------------------|-----------------------------|--------------------------------------------|
| Cutouts SVG        | `keyboard-plate.svg`        | Switch and stabilizer cutouts only         |
| Cutouts DXF        | `keyboard-plate.dxf`        | Switch and stabilizer cutouts only         |
| Outline SVG        | `keyboard-outline.svg`      | Outline only (when not merged)             |
| Outline DXF        | `keyboard-outline.dxf`      | Outline only (when not merged)             |
| Merged SVG         | `keyboard-plate.svg`        | Combined cutouts + outline                 |
| Merged DXF         | `keyboard-plate.dxf`        | Combined cutouts + outline                 |
| STL                | `keyboard-plate.stl`        | 3D solid plate (requires outline enabled)  |
| JSCAD              | `keyboard-plate.jscad`      | OpenJSCAD script (requires outline enabled)|

Files are created as in-memory blobs and downloaded via a temporary anchor element.

## 3D Preview

When a plate has been generated with outline enabled, a **3D tab** appears in the preview panel alongside the existing 2D tab. The 3D tab hosts the `Plate3DPreview` component, which renders the plate STL in an interactive WebGL viewport using Three.js.

### Scene Setup

- **Renderer:** `THREE.WebGLRenderer` with antialiasing. Created lazily once the container has non-zero dimensions (tracked via `ResizeObserver`). Disposed and recreated whenever `stlData` changes.
- **Camera:** `PerspectiveCamera` (45° FOV). Auto-positioned to fit the bounding box of the loaded geometry at `maxDim * 1.5` distance along the Z axis.
- **Lights:** Ambient (0.6 intensity) + directional key light (1.2, position [1, 2, 3]) + fill light (0.3, position [-2, -1, -1]).
- **Mesh:** Plate geometry parsed from ASCII STL with `STLLoader`. Material is `MeshPhongMaterial` colored by the active Bootstrap theme's `--bs-primary` CSS variable, with a specular highlight at 35% brightness.
- **Background:** Set to the container element's resolved `background-color` (read from computed styles, not a CSS variable, to get the actual RGB value).

### Controls

`OrbitControls` are disabled by default to avoid hijacking page scroll. A "Click to navigate" hint overlay is shown until the user clicks the canvas. Clicking outside the preview container deactivates controls, restoring normal page scroll. The reset view button (bottom-right corner) restores the camera to its initial auto-fitted position and target.

### Theme Adaptation

A `MutationObserver` watches the `data-bs-theme` attribute on `<html>`. When the website theme changes (light ↔ dark), `applyThemeColors()` re-reads the resolved CSS colors and updates the renderer clear color and mesh material colors on the next animation frame.

### Lifecycle

Three.js modules are preloaded via `preloadThreeModule()` on `PlateGeneratorPanel` mount. The render loop (`requestAnimationFrame`) is paused when the 3D tab is not active (driven by the `visible` prop from `PlateGeneratorResults`) and resumed when it becomes visible again. All Three.js objects (renderer, geometry, material, controls, observers) are fully disposed on component unmount.
