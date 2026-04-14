# VIA & Vial Format

## What is VIA? {#via-format}

[VIA](https://www.caniusevia.com/) and [Vial](https://get.vial.today/) are keyboard configuration tools that use a special JSON format. VIA format wraps KLE layout data with additional metadata:

- Keyboard name
- Vendor and product IDs
- Matrix configuration
- Key matrix coordinates in labels

The key labels use a special format that maps physical key positions to switch matrix coordinates. For example, a key labeled `0,1` is in row 0, column 1 of the switch matrix. To learn more, see the [VIA specification](https://www.caniusevia.com/docs/layouts).

![VIA layout example showing matrix coordinates on keycaps](/via-layout-example.png){.docs-screenshot}

## Importing VIA Layouts {#importing-via}

To import a VIA layout file (e.g., from the [VIA keyboards repository](https://github.com/the-via/keyboards)):

1. Click the **Import** button in the toolbar
2. Select **From File** and choose a VIA JSON file (or use **From URL** with a direct link)
3. The layout will be displayed and VIA metadata will appear in the **VIA Metadata** field of the **Keyboard Metadata** panel

On import, KLE-NG converts the VIA format to KLE format and preserves the VIA-specific metadata in a `_kleng_via_data` field within the KLE JSON, maintaining full KLE compatibility.

## Exporting to VIA Format {#exporting-via}

Layouts that contain VIA metadata can be exported back to VIA format:

1. Click the **Export** button in the toolbar
2. Select **Download VIA JSON**

> **Note:** The **Download VIA JSON** option is only available when VIA metadata is present in the layout.

## Editing VIA Metadata {#editing-via-metadata}

The VIA metadata is stored as JSON and can be edited directly in the **VIA Metadata** field. The editor validates your input in real-time — invalid JSON is highlighted with an error indicator.

> **Warning:** KLE-NG does **not** validate the *content* of the JSON. It is your responsibility to maintain VIA format conventions as defined in the [VIA specification](https://www.caniusevia.com/docs/specification).

**Tips:**
- Clearing the field removes all VIA metadata from the layout
- VIA metadata is preserved when exporting to KLE format (stored in the `_kleng_via_data` field)
- You can manually edit the metadata to customize keyboard name, vendor ID, product ID, and other fields

## Manufacturing Properties {#switch-orientation}

Manufacturing properties control how switches and stabilizers are physically mounted. These settings are used by the [Plate Generator](./plate-generator) and [PCB Generator](./pcb-generator).

### What are Manufacturing Properties?

The **Switch orientation** and **Stabilizer orientation** properties allow you to define the mounting orientation of physical switches and their stabilizers.

- These rotations are applied by the Plate Generator independently, on top of layout rotations
- Values must be a multiple of 90°

Most plate stabilizer cutout types are unidirectional, which forces a specific mounting orientation on the plate or PCB. Always validate that the stabilizer cutout matches the intended mounting orientation.

### Setting Manufacturing Properties

Select one or more keys on the canvas, then find the **Switch orientation** and **Stabilizer orientation** controls in the **Key Properties** panel.

### Cherry MX PCB Stabilizer Example {#stabilizer-orientation}

For a Cherry MX PCB-mounted stabilizer with the wire facing south, the correct orientation is shown below:

<div style="display:flex; flex-wrap:wrap; gap:1rem; margin-top:1rem;">
  <figure style="text-align:center; margin:0;">
    <img src="/cherry-mx-pcb-stabilizer-3d.png" alt="Cherry MX stabilizer 3D view" style="max-width:180px;">
    <figcaption>3D view</figcaption>
  </figure>
  <figure style="text-align:center; margin:0;">
    <img src="/cherry-mx-pcb-stabilizer-pcb.png" alt="Cherry MX stabilizer PCB footprint" style="max-width:180px;">
    <figcaption>PCB footprint</figcaption>
  </figure>
  <figure style="text-align:center; margin:0;">
    <img src="/cherry-mx-pcb-stabilizer-cutout.png" alt="Cherry MX plate cutout" style="max-width:180px;">
    <figcaption>Plate cutout</figcaption>
  </figure>
</div>
