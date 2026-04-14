# Plate Generator

The Plate Generator creates switch and stabilizer cutouts for your keyboard layout, exporting to SVG, DXF, STL, and JSCAD formats for manufacturing processes like laser cutting or 3D printing.

![Plate generator example](/plate-example.svg)

> **Warning:** The Plate Generator does **not** prevent usage of settings which are not manufacturable in practice. Always validate your settings against your intended manufacturing method.

## Overview {#overview}

Open the **Plate Generator** panel in the right sidebar. The panel is organized into three tabs:

- **Switch Cutouts** — Select switch type, stabilizer style, fillet radius, and kerf compensation
- **Holes** — Add corner mounting holes or custom holes at arbitrary positions
- **Outline** — Generate a border around the key cluster

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

To adjust the orientation of individual switch or stabilizer cutouts, set the **Switch orientation** or **Stabilizer orientation** property in the **Key Properties** panel. See [Manufacturing Properties](./via-and-metadata#switch-orientation) for details.

## Holes {#holes}

### Corner Mounting Holes

Places holes at each corner of the plate at a specified distance from the edge. Requires outline generation to be enabled.

### Custom Holes

Add holes at arbitrary positions using keyboard units (U). The reference position (0,0) is marked with a red cross in the preview.

## Outline {#outline}

Generate a border around the key cluster.

### Outline Type

| Type | Description |
|------|-------------|
| **None** | No outline generated |
| **Rectangular** | Axis-aligned bounding box with independent top/bottom/left/right margins |
| **Tight** | A hull that closely follows the key cluster shape, expanded by a single uniform margin |

The **Tight** outline is useful for non-rectangular layouts or split keyboards. **Ghost keys** (keys with the *Ghost* property enabled) are included in the hull calculation without producing switch cutouts — place them at the edges of the layout to fine-tune the outline shape.

### Outline Settings

| Setting | Description |
|---------|-------------|
| **Margin / Margins** | Distance from cutout bounds to outline edge (switch and stabilizer cutouts are considered; holes are not) |
| **Fillet Radius** | Rounds corners of the outline |
| **Plate Thickness** | Thickness of the plate in STL export |
| **Merge with Cutouts** | Place cutouts and outline in a single file; if separate, the outline file shares the same (0,0) origin for easier CAD/CAM handling |

## JSCAD Format

The exported JSCAD file uses **OpenJSCAD v2** format. Open it in the online viewer at [openjscad.xyz](https://openjscad.xyz/).

## Credits

Based on [ai03 Plate Generator](https://kbplate.ai03.com/) and [swillkb Plate & Case Builder](http://builder.swillkb.com/).
