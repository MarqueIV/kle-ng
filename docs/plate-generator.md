# Plate Generator

The Plate Generator creates switch and stabilizer cutouts for your keyboard layout, exporting to SVG, DXF, STL, and JSCAD formats for manufacturing processes like laser cutting or 3D printing.

<img src="/screenshots/plate-generator-panel-light.png" class="docs-screenshot light-only" alt="Plate generator panel" />
<img src="/screenshots/plate-generator-panel-dark.png" class="docs-screenshot dark-only" alt="Plate generator panel" />

::: warning
The Plate Generator does **not** prevent usage of settings which are not manufacturable in practice. Always validate your settings against your intended manufacturing method.
:::

## Overview {#overview}

Open the **Plate Generator** panel. The settings section is organized into three tabs:

- **Switch Cutouts** — Select switch type, stabilizer style, fillet radius, and kerf compensation
- **Holes** — Add corner mounting holes or custom holes at arbitrary positions
- **Outline** — Generate a border around the key cluster

## Typical Workflow

1. Complete your key layout design in the canvas editor.
2. Open the **Plate Generator** panel.
3. On the **Switch Cutouts** tab, select the switch type and any stabilizer options for your layout.
4. On the **Outline** tab, choose an outline type and set your margins.
5. If you need mounting holes, configure them on the **Holes** tab.
6. Review the live preview. The preview updates automatically as you change settings.
7. Click **Download** to export in your preferred format (SVG or DXF for laser cutting; STL or JSCAD for 3D printing).

::: tip
If specific keys need a different switch or stabilizer orientation (e.g., rotated stabilizers on a split spacebar), set the **Switch orientation** or **Stabilizer orientation** per key in the **Key Properties** panel before generating. See [Manufacturing Properties](./key-properties#switch-orientation) for details.
:::

## Switch Cutouts {#switch-cutouts}

Configure the shape and size of switch cutouts.

**Supported switch types:**

- Cherry MX
- Alps
- Kailh Choc

### Fillet Radius

Rounds the corners of cutouts. Useful for CNC routing where sharp internal corners are not achievable. Note: the upper limit for fillet values is dictated by geometry, not by actual application constraints.

### Size Adjustment (Kerf) {#kerf}

Kerf is the total width of material removed by the cutting tool (e.g., the laser beam). The cutout path shrinks by half the kerf value on each side so the final physical hole matches the intended size.

**Example:** A 14mm cutout with kerf 0.5mm is drawn at 13.5mm. The laser removes 0.25mm per side, resulting in a 14mm hole.

This is an **advanced** option and can often be left at 0. Negative values expand cutouts, which is useful for small adjustments in 3D printing.

### Merge Cutouts {#stabilizer-settings}

Combines overlapping shapes into single paths. Useful when stabilizer cutouts overlap with switch cutouts.

### Per-Key Orientation

To adjust the orientation of individual switch or stabilizer cutouts, set the **Switch orientation** or **Stabilizer orientation** property in the **Key Properties** panel. See [Manufacturing Properties](./key-properties#switch-orientation) for details.

## Holes {#holes}

### Corner Mounting Holes

Places holes at each corner of the plate at a specified distance from the edge. Requires outline generation to be enabled.

### Custom Holes

Add holes at arbitrary positions using keyboard units (U). The reference position (0,0) is marked with a red cross in the preview.

## Outline {#outline}

Generate a border around the key cluster.

### Outline Type

| Type            | Description                                                                      |
| --------------- | -------------------------------------------------------------------------------- |
| **None**        | No outline generated                                                             |
| **Rectangular** | Axis-aligned bounding box with independent top/bottom/left/right margins         |
| **Tight**       | A convex hull that encloses the key cluster, expanded by a single uniform margin |

The **Tight** outline is useful for non-rectangular layouts or split keyboards. **Ghost keys** (keys with the _Ghost_ property enabled) are included in the hull calculation without producing switch cutouts — place them at the edges of the layout to fine-tune the outline shape.

### Outline Settings

| Setting                | Description                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Margin / Margins**   | Distance from cutout bounds to outline edge (switch and stabilizer cutouts are considered; holes are not)                          |
| **Fillet Radius**      | Rounds corners of the outline                                                                                                      |
| **Plate Thickness**    | Thickness of the plate in STL export                                                                                               |
| **Merge with Cutouts** | Place cutouts and outline in a single file; if separate, the outline file shares the same (0,0) origin for easier CAD/CAM handling |

## JSCAD Format

The exported JSCAD file uses **OpenJSCAD v2** format. Open it in the online viewer at [openjscad.xyz](https://openjscad.xyz/).

## Using Ghost Keys to Shape the Outline

The **Ghost** key property (in the **Key Properties** panel) marks a key as invisible — it is included in outline hull calculations but produces no switch cutout. This lets you control the outline shape in ways that the key cluster alone cannot:

- Extend the outline past the edge of the cluster (place a ghost key outside the normal key area)
- Protect clearance for a USB connector or encoder by placing a ghost key in that space
- Smooth corners on an irregular layout by placing ghost keys at extremes of the hull

Ghost keys appear as faint transparent rectangles on the canvas so they remain visible while editing.

## Troubleshooting

**Cutouts appear at wrong positions** — Verify that your layout uses the correct mm/U spacing in **Keyboard Metadata**. Cherry MX standard is 19.05 mm/U. Kailh Choc is 18 mm/U. A mismatch here causes cutouts to be placed at wrong physical distances.

**Stabilizer cutout is the wrong orientation** — Set the **Stabilizer orientation** on individual keys in **Key Properties**. Values must be a multiple of 90°. See [Manufacturing Properties](./key-properties#switch-orientation) for guidance.

**Outline doesn't wrap closely enough** — Switch to the **Tight** outline type. Use ghost keys to extend coverage to areas the key cluster doesn't reach.

**Kerf value to use** — 0 is correct for many laser cutters where you want to program exact dimensions. Ask your cutting service for the actual kerf (typically 0.1–0.5 mm for laser cutting). Use negative kerf to expand cutouts (sometimes useful for FDM 3D printing where plastic shrinks slightly).

## Credits

Based on [ai03 Plate Generator](https://kbplate.ai03.com/) and [swillkb Plate & Case Builder](http://builder.swillkb.com/).
