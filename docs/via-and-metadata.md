# VIA & Vial Format

## What is VIA? {#via-format}

[VIA](https://www.caniusevia.com/) and [Vial](https://get.vial.today/) are keyboard configuration tools used to remap keycodes on a running keyboard without reflashing firmware. They rely on a keyboard definition file that describes the physical layout alongside switch matrix wiring.

VIA format is a JSON file that wraps KLE layout data with additional metadata:

- Keyboard name
- Vendor and product IDs
- Matrix configuration (number of rows and columns)
- Key matrix coordinates in labels

The key labels use a special format that maps physical key positions to switch matrix coordinates. For example, a key labeled `0,1` is in row 0, column 1 of the switch matrix. To learn more, see the [VIA specification](https://www.caniusevia.com/docs/layouts).

**When do you need VIA format?**

- You are designing a keyboard that will use VIA or Vial for key remapping
- You want to use the [PCB Generator](./pcb-generator), which reads matrix coordinates from key labels
- You are working from an existing VIA keyboard definition and want to edit the layout visually

If you only need a visual layout for documentation or plate generation, you do not need VIA format.

![VIA layout example showing matrix coordinates on keycaps](/via-layout-example.png){.docs-screenshot}

## Matrix Coordinates {#matrix-coordinates}

Matrix coordinates identify where each physical switch connects in the keyboard's electrical matrix. Each coordinate is written as `row,col` (e.g., `0,0`, `0,1`, `1,0`).

The easiest way to assign coordinates is **Extra Tools → Add Switch Matrix Coordinates**. This tool lets you annotate your layout automatically or draw rows and columns manually. See [Add Switch Matrix Coordinates](./layout-editor#add-switch-matrix-coordinates) for detailed instructions.

::: warning
Automatic annotations may not produce correct results for certain keyboard layouts, particularly **ergonomic layouts with significant column splay**. Manual correction may be required for complex designs. See [issue #51](https://github.com/adamws/kle-ng/issues/51) for details.
:::

If you already have matrix coordinates (from a QMK or VIA import), they will appear in the top-left label position of each key.

## Importing VIA Layouts {#importing-via}

To import a VIA layout file (e.g., from the [VIA keyboards repository](https://github.com/the-via/keyboards)):

1. Click the **Import** button in the toolbar
2. Select **From File** and choose a VIA JSON file (or use **From URL** with a direct link)
3. The layout will be displayed and VIA metadata will appear in the **VIA Metadata** field of the **Keyboard Metadata** panel

On import, kle-ng converts the VIA format to KLE format and preserves the VIA-specific metadata in a `_kleng_via_data` field within the KLE JSON, maintaining full KLE compatibility.

## Exporting to VIA Format {#exporting-via}

Layouts that contain VIA metadata can be exported back to VIA format:

1. Click the **Export** button in the toolbar
2. Select **Download VIA JSON**

::: info
The **Download VIA JSON** option is only available when VIA metadata is present in the layout.
:::

## Editing VIA Metadata {#editing-via-metadata}

The VIA metadata is stored as JSON and can be edited directly in the **VIA Metadata** field. The editor validates your input in real-time — invalid JSON is highlighted with an error indicator.

::: warning
kle-ng does **not** validate the _content_ of the JSON. It is your responsibility to maintain VIA format conventions as defined in the [VIA specification](https://www.caniusevia.com/docs/specification).
:::

**Tips:**

- Clearing the field removes all VIA metadata from the layout
- VIA metadata is preserved when exporting to KLE format (stored in the `_kleng_via_data` field)
- You can manually edit the metadata to customize keyboard name, vendor ID, product ID, and other fields
