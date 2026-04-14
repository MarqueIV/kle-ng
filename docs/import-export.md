# Import & Export

kle-ng supports importing and exporting keyboard layouts in multiple formats.

## Supported Formats

### KLE JSON {#kle-format}

The standard [Keyboard Layout Editor JSON format](https://github.com/ijprest/kle-serial).

- Import and export layouts compatible with keyboard-layout-editor.com
- Supports both raw array format and internal format with metadata

### PNG {#png-format}

- **Export**: Layouts are exported as PNG images with embedded layout data. Zoom in on the canvas before exporting to increase output resolution — the export captures the canvas at the current zoom level.
- **Import**: PNG files with embedded layout data can be re-imported to recover the editable layout — useful for sharing and archiving

::: tip
Zoom in on the canvas before exporting to PNG to increase the output image resolution.
:::

### HTML and SVG {#html-svg-format}

- **HTML export**: Produces a self-contained document (embedded CSS, no external dependencies) that renders the keyboard in any browser
- **SVG export**: Produces a vector graphics file suitable for embedding in documents or editing in vector tools
- Both formats are visually consistent with the editor, including support for rotated keys, ISO/non-rectangular shapes, homing nubs, rotary encoders, ghost and decal keys
- Import is **not** supported for HTML or SVG

### VIA/Vial Format {#via-format}

[VIA](https://www.caniusevia.com/) and [Vial](https://get.vial.today/) are keyboard configuration tools that use a special JSON format. VIA format wraps KLE layout data with additional metadata (keyboard name, vendor/product IDs, matrix configuration).

**On import**, kle-ng converts VIA format to KLE format and preserves VIA-specific metadata in a `_kleng_via_data` field, maintaining full compatibility.

**On export**, layouts containing `_kleng_via_data` metadata can be exported back to VIA JSON format using **Export → Download VIA JSON**.

<table>
<thead><tr>
<th>Imported file</th>
<th>Import result</th>
</tr></thead>
<tbody><tr>
<td>

```json
{
  "name": "Test VIA Layout",
  "vendorId": "0x1234",
  "productId": "0x5678",
  "matrix": { "rows": 2, "cols": 4 },
  "layouts": {
    "keymap": [
      ["0,0", "0,1", "0,2", "0,3"],
      ["1,0", "1,1", "1,2", "1,3"]
    ]
  }
}
```

</td>
<td>

<a href="https://editor.keyboard-tools.xyz/#share=NobwRA+g1gNgpgOwOYQG4EsCGEAmmAumYAXGAHIAsAkkjkgBZL5IAO6AQgMZUCCAjgFkAIgHkeADR7seZAIoApKgFEAYgJ4AtAMI8AKgHcAEgGd24nEp4BxejyGcAmvr2ck8gIwAPBwCUePBx4ABR4qZwBbHgFnAHURdH8RAHZOdAAGAHt2ACscFU8KHQAnO0Ck-woWAFUtEQQHdgAZADMkGHYATx4kviRdIQA2dAAOJHZ8ACNhzlkVAE4B3WMYcQBlVCQkgFcAVn8AXjAAXwAaYDA0k7SwE4uT9xu7gCZHy4BmMABdM7B3K8e-g9bn8XsCTh9Pp8gA">
  <img src="/layout-with-via-metadata.png" alt="VIA layout import result">
</a>

</td>
</tr></tbody>
</table>

See [VIA & Vial Format](./via-and-metadata) for detailed information.

### QMK Format {#qmk-format}

[QMK](https://qmk.fm/) `info.json` files can be imported directly. kle-ng converts key positions, dimensions, and matrix coordinates into KLE format.

Imported keys receive:

- Positions from `x`, `y` values
- Dimensions from `w`, `h` (default: 1×1)
- Rotation from `r`, `rx`, `ry`
- Matrix coordinates in the top-left label as `row,col`

<table>
<thead><tr>
<th>Imported file</th>
<th>Import result</th>
</tr></thead>
<tbody><tr>
<td>

```json
{
  "keyboard_name": "Example",
  "manufacturer": "Example",
  "layouts": {
    "LAYOUT_default": {
      "layout": [
        { "matrix": [3, 3], "x": 4, "y": 4.25 },
        { "matrix": [3, 4], "x": 4, "y": 4.25, "r": 15, "rx": 4.5, "ry": 9.1 },
        { "matrix": [3, 5], "x": 4, "y": 4.25, "h": 1.5, "r": 30, "rx": 5.4, "ry": 9.3 }
      ]
    }
  }
}
```

</td>
<td>

<a href="https://editor.keyboard-tools.xyz/#share=NobwRAhgrgLgFgewE5gFxgKIA8IFsAOANgKZgA0YAdnqetnkaQL5mhhZoAsFAnlwHQAmAKwswAZjLiwAXVbgUqAIzCKSDqk79VYJH1QBOfkooaAtAAZtvNGa0AOURUmdZ83WnEW1G4f266+kaS7LZK-haRUdHRAfpmfhbCMSkWJmBwaOFOEmTCsjJAA">
  <img src="/qmk-example-layout.png" alt="QMK layout import result">
</a>

</td>
</tr></tbody>
</table>

After importing a QMK layout, you can use the [PCB Generator](./pcb-generator) immediately since matrix coordinates are already assigned.

::: info
kle-ng does **not** support export to QMK format.
:::

### Ergogen Format {#ergogen-format}

[Ergogen](https://ergogen.xyz/) is a keyboard layout generator that uses YAML configuration. kle-ng can import:

- Ergogen YAML files directly
- Ergogen share URLs (e.g., `https://ergogen.xyz/#N4Igxg9gdg...`)

kle-ng decodes the URL, processes it with the Ergogen library, and converts the result to KLE format for editing.

<table>
<thead><tr>
<th>Imported file</th>
<th>Import result</th>
</tr></thead>
<tbody><tr>
<td>

```yaml
meta:
  engine: 4.1.0
points:
  zones:
    matrix:
      anchor:
        rotate: 5
  # [...cut for readability...]
  rotate: -20
  mirror:
    ref: matrix_pinky_home
    distance: 223.7529778
```

</td>
<td>

<a href="https://editor.keyboard-tools.xyz/#share=NobwRAzgDghgxgSwHYHMD6APMAuAjATgBpJZFU0BPHAgX0NDACdqBWYxrbABgDo2mq2AEw8AbC1wAOACwBmYpwC0vfoOV86YALYwALowQY0UZAGsKaAEYB7XbutawAXXrgOOXgHYWkyQXaCuGKSLPhSCjjqqpEqmjr6hsZmFgAWDgCmzq5MnEFcuJ6ispIBHjyeBPj4QhHYUcRqscTxBkYmSOZo9lBZDMzCXOy5YviiXELyAjgisp74xfxKKg0xGs16rWgG5DZ2Dr1unCJcxVxypXg8cqPztfVgjWvaG4nb6GlamS59RzynXKJpBdlmAlnwVnUms8EkY3l1rD1vodpuUhCxPEJcBcRNJPNJcOFQatopCni1EloEAATKkAG3SVls9kcSJyOFkPABnjxWKmlxYsmk0jRdxBjxYcReRkpNPpaA+X2y7mwHOkXHwhV5jEEKnwuNkkzBJKikphaBldIZ3QObJVfHRas8Fw5BKEvkNxIhJvWZuQVPSRl2zJtyo53Ld3gu0j+om8J1F4IexM0uhSAFctJYAGYwJBoJDpGCMLrpzMhzgcyRVYUlPkiAqyfxE0nGqHkox+gPyjLlnDRoT4oW17XUHgTQX4WtGr1tqVoTtGa2s5XR6SiXDq4eCDksAV+KeepMt02bZAF4tB-bLzjRyQnAlblHr-FCUQJ1tkudn9LFhW97AsDwuDSBIxQXEEsZCga74zp+vpIOe8KIkqfbDjePAyOIsg1HygG4K+aK8tOR7emAqYZtmubdp8JYUSGOCFEMOCAdIvhVm+fKiGOngGrMMEkVC5GZjmeY5sWQmWPRdSMbangYVwLCYosh7inECCMIw1jiaWlGiUWtFlsukSsUx2CSFcuLoo+AFAQREj8apzTqZp2kUSJ1FWjpUmKEIgy2uZwFVhi4FiHicgei2sESk5GlaeaX4IT+SH-uZ0j4Oqtx1mIwH4RxxGOdozlxe286Jb+PbXjg5mSAa+STCOdq7sUhL5cmMUufF8GIZeLJKpw+CcopohFCF45pQekUCWSRXFiVC7JZV2ADbIeqiDV2JATxTatce7XFQl-pGH+i0DYp+GyPwDXRrIsYsPGzb3AVlKxa5wlUQW+kSf+A08bG90NS6+Hug5bWFS9nWnkgh2MnsvU-DgA2+HIaXAnweo8RFj2g89HUlRacpLn11C8EIr43UQfJBAKQoig9YrYzNEMUtSloef+G58GtxQUw1OI8i1KkM+DeMs3KPXs7wYRqriqPKZNT2MyVcKE-DeBBGiYyxiF1yiJlO2kTj+1mnCx1E2raN3pITpZbM8whCDu1g7jc5wuLRl1Lgl25CIQiFPqqMVFU1QOwbitzu0nQq8ieAiAKinB5TwShAL8tC87ZoR6kFVm-h5R6gSWqCCI4hSOcdOJgrwvh8kMPBk4ThAA">
  <img src="/ergogen-import-result.png" alt="Ergogen layout import result">
</a>

</td>
</tr></tbody>
</table>

::: info
kle-ng does **not** support export to Ergogen format.
:::

::: warning
kle-ng aims to preserve exact key positions when importing Ergogen layouts, but always double-check alignment when mixing outputs from different tools (e.g., Ergogen for PCB + ai03 Plate Generator for plate).
:::

## Importing {#importing}

kle-ng supports multiple import methods:

### Import Button

Click the **Import** button in the toolbar and select:

- **From File** — Browse for a file on your computer. Supported formats: JSON (KLE, VIA/Vial, QMK), PNG (with embedded layout data), Ergogen YAML
- **From URL** — Enter any of the supported URL formats:
  - Direct JSON URL (any publicly accessible JSON file)
  - GitHub Gist URL
  - Ergogen share link (`https://ergogen.xyz/#...`)
  - Existing kle-ng share link

### Drag and Drop

Drag layout files directly onto the canvas area.

Supported file formats: **JSON** (KLE, VIA/Vial, QMK), **PNG** (with embedded layout data), **Ergogen YAML**

![Drag and drop import](/file-drag-and-drop.gif)

### Share Links

Open layouts shared via URL directly in the browser:

- **kle-ng share link**: `https://editor.keyboard-tools.xyz/#share=NrDeC...`
- **Direct Gist ID**: `https://editor.keyboard-tools.xyz/#gist=<gist-id>`
- **Universal URL format**: `https://editor.keyboard-tools.xyz/#url=<url>`
  - Supports GitHub Gist URLs and Ergogen URLs as the `url=` parameter

### GitHub Gist File Priority

When importing from a GitHub Gist, kle-ng searches for layout files in this priority order:

1. `layout.json`
2. `keyboard.json`
3. `kle.json`
4. Any file containing "layout" or "keyboard" in the name
5. Any `.json` file

The JSON file may be in any recognizable layout format.

::: info
GitHub API has rate limits for unauthenticated requests. If you encounter rate limit errors, wait a few minutes before trying again.
:::

## Exporting {#exporting}

Click the **Export** button in the toolbar to access all export options:

| Option            | Format        | Notes                                          |
| ----------------- | ------------- | ---------------------------------------------- |
| Download JSON     | KLE JSON      | Standard KLE format                            |
| Download PNG      | PNG           | Canvas-quality image with embedded layout data |
| Download HTML     | HTML          | Self-contained keyboard render                 |
| Download SVG      | SVG           | Vector graphics                                |
| Download VIA JSON | VIA/Vial JSON | Only available when VIA metadata is present    |
| Copy share link   | URL           | Generates a shareable `#share=` URL            |

## Troubleshooting Import/Export Issues

**Import fails with a parse error** — Verify the file is valid JSON. Common causes: trailing commas, single quotes instead of double quotes, or a file saved with non-JSON content. Try opening the file in a text editor to inspect it.

**GitHub Gist import fails** — GitHub API rate limits unauthenticated requests to 60 per hour per IP. If you hit the limit, wait about an hour before trying again. Alternatively, download the raw JSON and import **From File**.

**Ergogen import produces unexpected positions** — Ergogen's coordinate origin and key rotation conventions differ from KLE. kle-ng aims to preserve positions faithfully, but always cross-check the result against Ergogen's own preview before using the output for manufacturing.

**"Download VIA JSON" is greyed out** — VIA export is only available after importing a VIA file or manually adding VIA metadata in the **Keyboard Metadata** panel. See [VIA & Vial Format](./via-and-metadata) for details.
