# Matrix / Layout Annotation

This document describes the matrix annotation feature in the keyboard layout
editor. It covers the automatic annotation algorithm, the rotation-aware
annotation path, duplicate detection, manual drawing, modal states, and how
coordinates are applied to keys.

**Relevant source files:**

| File                                         | Role                                                    |
|----------------------------------------------|---------------------------------------------------------|
| `src/components/MatrixCoordinatesModal.vue`  | Modal UI, automatic annotation orchestration            |
| `src/utils/matrix-utils.ts`                  | Rotation grouping, de-rotation, label parsing           |
| `src/utils/matrix-validation.ts`             | Coordinate parsing, duplicate validation, option/choice |
| `src/stores/matrix-drawing.ts`               | Drawing store (sequences, completed wires, editing)     |
| `src/utils/keyboard-geometry.ts`             | `getKeyCenter` -- rotation-aware center calculation     |
| `src/utils/line-intersection.ts`             | `findKeysAlongLine` -- line sweep for manual drawing    |
| `src/components/MatrixAnnotationOverlay.vue` | Canvas overlay that renders wires and handles input     |

---

## Table of Contents

1. [Background -- VIA Matrix Coordinates](#1-background----via-matrix-coordinates)
2. [Modal States and Flows](#2-modal-states-and-flows)
3. [Automatic Annotation Algorithm](#3-automatic-annotation-algorithm)
4. [Rotation-Aware Annotation](#4-rotation-aware-annotation)
5. [Duplicate Detection and Resolution](#5-duplicate-detection-and-resolution)
6. [Manual Drawing](#6-manual-drawing)
7. [Applying Coordinates to Keys](#7-applying-coordinates-to-keys)
8. [Canvas Overlay Rendering](#8-canvas-overlay-rendering)

---

## 1. Background -- VIA Matrix Coordinates

Mechanical keyboards use a switch matrix to read key presses. Each physical key
is connected to one row wire and one column wire. Pressing a key closes the
circuit between its row and column, allowing the controller to detect which key
was pressed.

The [VIA configurator](https://www.caniusevia.com/docs/layouts) expects every
key in a layout definition to carry a `"row,col"` annotation in label position
0 (top-left). The matrix annotation feature provides two ways to assign these
coordinates: an automatic algorithm based on key geometry, and a manual drawing
tool.

Label format examples:

```
"0,0"   -- row 0, column 0  (complete)
"2,5"   -- row 2, column 5  (complete)
"1,"    -- row 1, column not yet assigned (partial)
",3"    -- row not assigned, column 3 (partial)
```

Ghost keys (`key.ghost === true`) and decal keys (`key.decal === true`) are
excluded from annotation throughout the system. They represent cosmetic
elements that do not participate in the electrical matrix.

---

## 2. Modal States and Flows

The modal (`MatrixCoordinatesModal.vue`) uses a two-step state machine:

```
                         +---------+
       modal opens ----->| warning |
                         +---------+
                              |
          +-------------------+-------------------+
          |                   |                   |
    "OK (clear all)"    "Continue"           "Cancel"
          |            (partial only)             |
    clear labels,           |              close modal
    go to draw         go to draw
          |            with existing
          v            annotations
       +------+              |
       | draw |<-------------+
       +------+
```

### The Five Open Scenarios

When the modal opens, it inspects the current layout state and picks one of
five paths. The decision tree lives in the visibility watcher inside
`MatrixCoordinatesModal.vue`.

| # | Condition                                          | Behavior                                                                                          |
|---|----------------------------------------------------|---------------------------------------------------------------------------------------------------|
| 1 | Fully annotated **with** invalid duplicates        | Show overlay preview, stay on `warning` step. User sees a yellow alert about duplicate positions. |
| 2 | Fully annotated, no invalid duplicates             | Show overlay preview, skip directly to `draw` step (editing existing annotations).                |
| 3 | No labels at all (blank layout)                    | Skip directly to `draw` step.                                                                     |
| 4 | Partially annotated (mix of VIA labels and blanks) | Stay on `warning` step, show "Continue" and "Start over" buttons.                                 |
| 5 | Non-matrix labels present                          | Stay on `warning` step with only "OK (clear all labels)" available.                               |

"Fully annotated" means `keyboardStore.isViaAnnotated` is `true` -- every
regular key has a label matching the pattern `/^\d+,\d+$/` in position 0.

"Invalid duplicates" means two or more keys share the same `row,col` position
without carrying `option,choice` values in label position 8 (bottom-right).
This check uses `validateMatrixDuplicates` from `matrix-validation.ts`.

### Warning Step Actions

- **OK (clear all labels)**: Calls `createEmptyLabels()` on every regular key,
  then transitions to `draw`.
- **Continue**: Calls `extractMatrixAssignmentsWithPartial` to parse the
  existing labels, loads them into both the modal state and the drawing store
  via `loadExistingAssignments`, then transitions to `draw`.
- **Start over**: Same as "OK" -- clears everything first.
- **Cancel**: Closes modal, no changes.

---

## 3. Automatic Annotation Algorithm

The "Annotate Automatically" button triggers `handleAutomaticAnnotation()`.
The core idea: use each key's visual center position (in layout units) to
derive integer row and column indices.

### 3.1 Key Center Calculation (`getKeyCenter`)

Located in `keyboard-geometry.ts`, this function computes the center of a key
in layout coordinate space. For an unrotated 1u key at position `(x, y)`, the
center is simply `(x + 0.5, y + 0.5)`.

For rotated keys the function applies the rotation transformation:

```
1. centerX = key.x + key.width / 2
   centerY = key.y + key.height / 2

2. Translate center relative to rotation origin:
     relX = centerX - originX
     relY = centerY - originY

3. Apply 2D rotation matrix:
     rotatedX = relX * cos(angle) - relY * sin(angle)
     rotatedY = relX * sin(angle) + relY * cos(angle)

4. Translate back:
     finalX = originX + rotatedX
     finalY = originY + rotatedY
```

If `rotation_x` / `rotation_y` are undefined, the center itself is used as
the rotation origin (which makes the rotation a no-op for the center point).

### 3.2 The `runAutomaticAnnotation` Inner Function

This function takes a list of keys and builds a `Map<string, Key[]>` that maps
`"row,col"` strings to the keys occupying that position:

```
for each key (excluding ghost/decal):
    center = getKeyCenter(key)
    row = Math.round(center.y)     // vertical position -> row
    col = Math.round(center.x)     // horizontal position -> column
    matrixMap["row,col"] -> append key
```

The integer rounding means that keys whose centers are within 0.5 units of
each other vertically will land on the same row, and likewise for columns.

**Example -- standard staggered layout:**

```
    Physical layout (1u keys):       Center positions:     Rounded:

    +---+---+---+---+                (0.5,0.5) (1.5,0.5)  row=1,col=1  row=1,col=2 ...
    | Q | W | E | R |                (2.5,0.5) (3.5,0.5)
    +---+---+---+---+
      +---+---+---+---+              (0.75,1.5) (1.75,1.5)  row=2,col=1  row=2,col=2 ...
      | A | S | D | F |              (2.75,1.5) (3.75,1.5)
      +---+---+---+---+

    (Stagger shifts x by 0.25u but rounding absorbs it)
```

### 3.3 Building Rows and Columns from the Matrix Map

After `runAutomaticAnnotation` produces the map, `buildMatrixFromMap` extracts
the unique row/column indices from all keys in the map, sorts them, and
creates sequential `MatrixItem` arrays:

```
1. Collect all unique row indices from map keys  -> sort ascending
2. Collect all unique column indices             -> sort ascending
3. For each unique row index (in sorted order):
     - Gather all keys with that row index
     - Sort them by x position (left to right)
     - Assign sequential row number (0, 1, 2, ...)
4. For each unique column index (in sorted order):
     - Gather all keys with that column index
     - Sort them by y position (top to bottom)
     - Assign sequential column number (0, 1, 2, ...)
```

The important distinction: the **original** row/col values from `Math.round`
may be non-sequential (e.g., rows 0, 1, 3 if there is a gap). The
`buildMatrixFromMap` function re-indexes them to 0, 1, 2, ... based on sorted
order.

### 3.4 Decision Path

The full algorithm follows this decision tree:

```
handleAutomaticAnnotation()
   |
   v
shouldUseRotationAwareAnnotation()?
   |                    |
  YES                  NO
   |                    |
   v                    v
Split by rotation    runAutomaticAnnotation(regularKeys)
De-rotate keys           |
Run annotation on        +-- duplicates? --+-- no --> buildMatrixFromMap
  de-rotated keys        |                 |
   |                     v                 v
   +-- duplicates? -+  Remove dupes    buildMatrixFromMap
   |                |  (keep first)
  YES              NO  buildMatrixFromMap
   |                |  + warn user
   v                v
Restore rotation  buildMatrixFromMap
Fall back to      Restore rotation
original layout   Done
   |
   v
runAutomaticAnnotation(originalKeys)
   |
   +-- duplicates? --+-- no --> buildMatrixFromMap
   |                 |
   v                 v
Remove dupes    buildMatrixFromMap
buildMatrixFromMap
+ warn user
```

---

## 4. Rotation-Aware Annotation

Many keyboard layouts include rotated key clusters (e.g., thumb clusters on
ergonomic boards). When keys are rotated, their visual centers shift in ways
that can cause `Math.round(center.y)` to map different keys to the same row
even though they are on different logical rows.

### 4.1 Activation Condition

`shouldUseRotationAwareAnnotation()` returns `true` when there is at least one
rotation group whose `rotationAngle` is non-zero (|angle| > 1e-6) **and** that
group has at least two keys.

### 4.2 `splitLayoutByRotation`

Groups keys by three rotation properties: `rotation_angle`, `rotation_x`, and
`rotation_y`. Two keys belong to the same group if and only if all three
properties match within floating-point tolerance (1e-6).

```
Input:  [key_A(angle=0), key_B(angle=0), key_C(angle=15, rx=3, ry=5), key_D(angle=15, rx=3, ry=5)]

Output: [
  RotationGroup { angle: 0,  rx: undefined, ry: undefined, keys: [A, B] },
  RotationGroup { angle: 15, rx: 3,         ry: 5,         keys: [C, D] },
]
```

The return type is `RotationGroup[]` -- see `matrix-utils.ts` for the
interface definition.

### 4.3 `deRotateLayoutGroups`

For each group with a non-zero rotation angle, this function:

1. Stores the original angle in `key.labels[6]` as `"DEROTATE:<angle>"`.
2. Sets `key.rotation_angle = 0`.

Keys in the zero-rotation group are passed through unchanged.

After this step, `getKeyCenter` will compute centers **without** any rotation
transform, which puts keys back into their "local" coordinate space. The
intent is that keys within a rotated cluster will now have aligned Y
coordinates that round to the same row.

### 4.4 `restoreOriginalRotation`

Reads the `"DEROTATE:<angle>"` marker from `labels[6]`, restores
`key.rotation_angle` to the stored value, and clears the marker. Keys without
the marker are left untouched.

### 4.5 Fallback Strategy

If the de-rotated layout still produces duplicates in the matrix map, the
system:

1. Restores the original rotation (`restoreOriginalRotation`).
2. Falls back to running the annotation on the unmodified layout.
3. If the fallback also has duplicates, it keeps only the first key at each
   position and shows a warning.

---

## 5. Duplicate Detection and Resolution

### 5.1 What Causes Duplicates

Two keys produce a duplicate when `Math.round(center.y)` and
`Math.round(center.x)` yield the same values for both. This typically happens
with:

- Keys that are very close together (e.g., ISO Enter occupying ~2 positions).
- Rotated clusters where the rotation shifts centers unpredictably.
- Unusual stagger values that cause centers to round to identical integers.

### 5.2 During Automatic Annotation

The `checkForDuplicates` helper scans the matrix map and collects every
position that maps to more than one key.

Resolution strategy:

- **First key wins**: `cleanMatrixMap` is built by keeping only `keys[0]` at
  each position (the first key encountered during iteration).
- A warning banner is shown listing each duplicate position and which keys
  were affected. The first key is labeled "(kept)" and the rest "(removed)".

### 5.3 During Manual Drawing (`canAddKeyToSequence`)

The drawing store prevents duplicates proactively. Before a key is added to
the current sequence, `canAddKeyToSequence` checks:

1. If drawing a **row** and the candidate key already has a column assignment,
   it computes what the new row index would be (either the continuing row
   index or the next free row number) and checks whether any existing key
   already occupies `(newRow, existingCol)`.

2. If drawing a **column** and the candidate key already has a row assignment,
   the same check is done for `(existingRow, newCol)`.

3. It also checks against other keys in the **current sequence** (which will
   all receive the same row or column index when the sequence completes).

If any check fails, the key is rejected and the overlay shows it with a red
circle and X marker.

### 5.4 VIA Option/Choice (Valid Duplicates)

Per the VIA spec, keys **may** share a matrix position when they represent
layout variants (e.g., split Backspace vs. 2u Backspace). These keys must
carry `option,choice` values in label position 8 (bottom-right), parsed by
`parseOptionChoice` in `matrix-validation.ts`.

`validateMatrixDuplicates` distinguishes between:

- **Invalid duplicates**: Multiple keys at the same position where at least
  one lacks an `option,choice` label.
- **Valid layout options**: Multiple keys at the same position where all
  carry `option,choice` labels.

The overlay only renders wires for "default layout" keys (those with
`choice === 0` or no option/choice at all), filtering via `getKeyChoice`.

---

## 6. Manual Drawing

### 6.1 Drawing Store (`matrix-drawing.ts`)

The Pinia store manages all drawing state:

| State                   | Type                                    | Purpose                                          |
|-------------------------|-----------------------------------------|--------------------------------------------------|
| `drawingType`           | `'row' \| 'column' \| 'remove' \| null` | Current editing mode                             |
| `currentSequence`       | `Key[]`                                 | Keys being drawn in the active (incomplete) wire |
| `completedRows`         | `Map<number, Key[]>`                    | Finished row wires, keyed by row number          |
| `completedColumns`      | `Map<number, Key[]>`                    | Finished column wires, keyed by column number    |
| `continuingRowIndex`    | `number \| null`                        | When extending an existing row                   |
| `continuingColumnIndex` | `number \| null`                        | When extending an existing column                |
| `insertAfterIndex`      | `number \| null`                        | T-junction insertion point                       |

### 6.2 Drawing Flow

Manual drawing follows a two-click interaction model:

```
1. User left-clicks a key (first click)
   -> Key added to currentSequence
   -> If clicked on an existing wire segment/node, set up continuation state

2. User moves mouse
   -> Overlay computes preview: findKeysAlongLine from last key to cursor
   -> Legal keys shown as gray dashed preview
   -> Illegal keys shown as red dashed preview with X markers

3. User left-clicks another key (second click)
   -> findKeysAlongLine sweeps the line between the two clicked keys
   -> All legal intermediate keys are auto-collected
   -> Sequence is completed (completeSequence)
   -> Wire appears as solid blue (row) or green (column) line
```

**Cancel drawing**: Right-click or Escape clears the current sequence.

### 6.3 Line Sweep (`findKeysAlongLine`)

When the user draws a line between two keys, `findKeysAlongLine` (in
`line-intersection.ts`) determines which intermediate keys the line passes
through.

For each candidate key, `lineIntersectsKey` computes the perpendicular
distance from the key's center to the line segment:

```
               line
    A --------*----------- B
               \
                \  perpendicular distance
                 \
                  * key center

    If distance <= threshold, key is "along the line"
```

The threshold is derived from the key's dimensions and modulated by a
`sensitivity` parameter (0.0 = most permissive, 1.0 = strictest; default
0.3 in the store). For non-rotated keys the threshold considers the key
dimension perpendicular to the line direction. For rotated keys a conservative
diagonal-based radius is used.

Keys beyond the segment endpoints receive special treatment: the algorithm
checks whether the endpoint falls within the key's bounding box rather than
using the distance threshold, preventing wide keys past the ends from being
incorrectly collected.

Results are sorted by distance from the start point so they appear in
traversal order.

### 6.4 Row and Column Number Assignment

New wires receive the next free index. `findNextFreeRowNumber` /
`findNextFreeColumnNumber` search from 0 upward to find the first unused
number, filling gaps left by deletions.

### 6.5 Continuing and Extending Wires (T-Junctions)

Clicking on an existing wire's node or segment starts a "continuation":

- `continuingRowIndex` / `continuingColumnIndex` is set to the wire's index.
- `insertAfterIndex` and `insertionAnchorKey` record the clicked position.
- When the sequence completes, new keys are **merged** into the existing wire.

The merge uses `findOptimalInsertion`, which evaluates four candidate
orderings and picks the one with the lowest total path cost (sum of Euclidean
distances between consecutive keys):

```
Given existing wire:  [A] --- [B] --- [C]
Insert point: after B
New keys: [X, Y]

Candidates:
  1. forward-after:   [A, B, X, Y, C]
  2. forward-before:  [A, X, Y, B, C]
  3. reversed-after:  [A, B, Y, X, C]
  4. reversed-before: [A, Y, X, B, C]

Winner: minimum total Euclidean path cost
Tie-break: prefer forward-after > forward-before > reversed-after > reversed-before
```

### 6.6 Remove Mode

The drawing mode toggle includes a "Remove" option. In this mode:

| Action               | Ctrl held? | Result                                                      |
|----------------------|------------|-------------------------------------------------------------|
| Click node           | No         | Remove that single key from its row or column               |
| Click node (overlap) | No         | Remove key from both its row and column                     |
| Click segment        | No         | Split the wire at that segment boundary (creates two wires) |
| Click segment        | Yes        | Remove the entire wire                                      |

Segment splitting uses `splitRowAtSegment` / `splitColumnAtSegment` in the
drawing store. These functions:

1. Divide the key array at the segment boundary.
2. Keep the first portion under the original wire number.
3. Create a new wire with the next free number for the second portion.
4. Update key labels to reflect the new wire numbers.

### 6.7 Renumbering

Users can change a row or column number by hovering over its wire and typing
digits, then pressing Enter.

- `renumberRow(old, new)` and `renumberColumn(old, new)` handle the swap.
- If the target number is already in use, the two wires are **swapped**
  (neither is lost).
- Key labels are updated immediately via `updateKeyLabel`.

---

## 7. Applying Coordinates to Keys

`applyCoordinatesToKeys()` is called after any change to the row/column
assignments. It builds two lookup maps (`keyToRow`, `keyToCol`) from the
modal's `rows` and `cols` arrays, then iterates every regular key:

```
for each key (excluding ghost/decal):
    rowIndex = keyToRow.get(key)
    colIndex = keyToCol.get(key)

    if both defined:  key.labels[0] = "row,col"
    if row only:      key.labels[0] = "row,"
    if col only:      key.labels[0] = ",col"
    if neither:       key.labels[0] = ""
```

This is called:

- Immediately after automatic annotation completes.
- On every drawing store change (via watcher, unless `skipNextSync` is set).
- When the annotation is detected as complete.

### Sync Watcher

A Vue `watch` on the drawing store's completed rows/columns triggers
`syncDrawingsToModal` followed by `applyCoordinatesToKeys`:

```
watch([completedRows.size, completedColumns.size, totalKeysInRows, totalKeysInColumns])
  -> syncDrawingsToModal()      // convert store Maps to modal's MatrixItem[]
  -> applyCoordinatesToKeys()   // write labels to keys
```

The `skipNextSync` flag prevents re-application after context menu removals,
where the removal handler has already updated labels directly.

---

## 8. Canvas Overlay Rendering

`MatrixAnnotationOverlay.vue` renders a `<canvas>` element layered on top of
the keyboard canvas. It draws:

| Element                 | Color                   | Style                                     |
|-------------------------|-------------------------|-------------------------------------------|
| Completed row wires     | Blue (#007bff)          | Solid line, filled circles at nodes       |
| Completed column wires  | Green (#28a745)         | Solid line, filled circles at nodes       |
| Active drawing sequence | Orange/yellow (#ffc107) | Thicker solid line                        |
| Preview (legal keys)    | Gray (50% opacity)      | Dashed line, semi-transparent circles     |
| Preview (illegal keys)  | Red (80% opacity)       | Dashed line, circles with X marks         |
| Hovered wire            | Blue or Green           | Thicker line (4px vs 2px), larger circles |
| Hovered node            | Yellow (#ffc107)        | Semi-transparent highlight circle         |

All rendering uses the same coordinate transform as the main keyboard canvas
(zoom + pan offset), so wires align exactly with keys.

Only "default layout" keys (no `option,choice` or `choice === 0`) have their
wires rendered. Alternative layout option keys are stored in the wire arrays
but filtered out during rendering.

---

## Architecture Diagram

```
+---------------------------+
| MatrixCoordinatesModal    |  (orchestration, UI, auto-annotation)
+-------------+-------------+
              |
              | reads/writes
              v
+---------------------------+
| matrix-drawing store      |  (Pinia: sequences, completed wires, editing)
+-------------+-------------+
              |
              | observed by
              v
+---------------------------+
| MatrixAnnotationOverlay   |  (canvas rendering, mouse/keyboard input)
+---------------------------+
              |
              | uses
              v
+---------------------------+     +---------------------------+
| keyboard-geometry.ts      |     | line-intersection.ts      |
| - getKeyCenter            |     | - findKeysAlongLine       |
| - getKeyDistance          |     | - lineIntersectsKey       |
+---------------------------+     +---------------------------+
              |
              | uses
              v
+---------------------------+
| matrix-utils.ts           |  (rotation grouping, de-rotation, label parsing)
+---------------------------+
              |
              v
+---------------------------+
| matrix-validation.ts      |  (coordinate parsing, duplicate validation,
|                           |   option/choice support)
+---------------------------+
              |
              v
+---------------------------+
| keyboard store            |  (isViaAnnotated, hasInvalidMatrixDuplicates,
| (Pinia)                   |   key data, labels)
+---------------------------+
```
