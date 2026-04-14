# Import & Export

KLE-NG supports importing and exporting keyboard layouts in multiple formats.

## Supported Formats

### KLE JSON {#kle-format}

The standard [Keyboard Layout Editor JSON format](https://github.com/ijprest/kle-serial).

- Import and export layouts compatible with keyboard-layout-editor.com
- Supports both raw array format and internal format with metadata

### PNG {#png-format}

- **Export**: Layouts are exported as PNG images with embedded layout data
- **Import**: PNG files with embedded layout data can be re-imported to recover the editable layout — useful for sharing and archiving

### HTML and SVG {#html-svg-format}

- **HTML export**: Produces a self-contained document (embedded CSS, no external dependencies) that renders the keyboard in any browser
- **SVG export**: Produces a vector graphics file suitable for embedding in documents or editing in vector tools
- Both formats are visually consistent with the editor, including support for rotated keys, ISO/non-rectangular shapes, homing nubs, rotary encoders, ghost and decal keys
- Import is **not** supported for HTML or SVG

### VIA/Vial Format {#via-format}

[VIA](https://www.caniusevia.com/) and [Vial](https://get.vial.today/) are keyboard configuration tools that use a special JSON format. VIA format wraps KLE layout data with additional metadata (keyboard name, vendor/product IDs, matrix configuration).

**On import**, KLE-NG converts VIA format to KLE format and preserves VIA-specific metadata in a `_kleng_via_data` field, maintaining full compatibility.

**On export**, layouts containing `_kleng_via_data` metadata can be exported back to VIA JSON format using **Export → Download VIA JSON**.

See [VIA & Vial Format](./via-and-metadata) for detailed information.

### QMK Format {#qmk-format}

[QMK](https://qmk.fm/) `info.json` files can be imported directly. KLE-NG converts key positions, dimensions, and matrix coordinates into KLE format.

Imported keys receive:
- Positions from `x`, `y` values
- Dimensions from `w`, `h` (default: 1×1)
- Rotation from `r`, `rx`, `ry`
- Matrix coordinates in the top-left label as `row,col`

> **Note:** KLE-NG does **not** support export to QMK format.

### Ergogen Format {#ergogen-format}

[Ergogen](https://ergogen.xyz/) is a keyboard layout generator that uses YAML configuration. KLE-NG can import:

- Ergogen YAML files directly
- Ergogen share URLs (e.g., `https://ergogen.xyz/#N4Igxg9gdg...`)

KLE-NG decodes the URL, processes it with the Ergogen library, and converts the result to KLE format for editing.

> **Note:** KLE-NG does **not** support export to Ergogen format.

> **Important:** KLE-NG aims to preserve exact key positions when importing Ergogen layouts, but always double-check alignment when mixing outputs from different tools (e.g., Ergogen for PCB + ai03 Plate Generator for plate).

## Importing {#importing}

KLE-NG supports multiple import methods:

### Import Button

Click the **Import** button in the toolbar and select:

- **From File** — Browse for a file on your computer
- **From URL** — Enter any of the supported URL formats:
  - Direct JSON URL (any publicly accessible JSON file)
  - GitHub Gist URL
  - Ergogen share link (`https://ergogen.xyz/#...`)
  - Existing KLE-NG share link

### Drag and Drop

Drag layout files directly onto the canvas area.

Supported file formats: **JSON** (KLE, VIA/Vial, QMK), **PNG** (with embedded layout data), **Ergogen YAML**

![Drag and drop import](/file-drag-and-drop.gif)

### Share Links

Open layouts shared via URL directly in the browser:

- **KLE-NG share link**: `https://editor.keyboard-tools.xyz/#share=NrDeC...`
- **Direct Gist ID**: `https://editor.keyboard-tools.xyz/#gist=<gist-id>`
- **Universal URL format**: `https://editor.keyboard-tools.xyz/#url=<url>`
  - Supports GitHub Gist URLs and Ergogen URLs as the `url=` parameter

### GitHub Gist File Priority

When importing from a GitHub Gist, KLE-NG searches for layout files in this priority order:

1. `layout.json`
2. `keyboard.json`
3. `kle.json`
4. Any file containing "layout" or "keyboard" in the name
5. Any `.json` file

The JSON file may be in any recognizable layout format.

> **Note:** GitHub API has rate limits for unauthenticated requests. If you encounter rate limit errors, wait a few minutes before trying again.

## Exporting {#exporting}

Click the **Export** button in the toolbar to access all export options:

| Option | Format | Notes |
|--------|--------|-------|
| Download JSON | KLE JSON | Standard KLE format |
| Download PNG | PNG | Canvas-quality image with embedded layout data |
| Download HTML | HTML | Self-contained keyboard render |
| Download SVG | SVG | Vector graphics |
| Download VIA JSON | VIA/Vial JSON | Only available when VIA metadata is present |
| Copy share link | URL | Generates a shareable `#share=` URL |
