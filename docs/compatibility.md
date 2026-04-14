# KLE Compatibility

KLE-NG maintains compatibility with the standard [KLE JSON format](https://github.com/ijprest/kle-serial) for layouts. However, **100% visual compatibility with keyboard-layout-editor.com is not a goal** — the same layout file may render slightly differently between the two editors.

## Intentionally Unsupported Features

The following features from the original Keyboard Layout Editor are **not** supported in KLE-NG:

### Key Profiles

Different key profiles (keycap shapes/appearance) are not supported. KLE-NG uses a single default keycap rendering style for all keys.

### Full HTML Label Styling

The original editor supported arbitrary HTML content in key labels with full CSS customization. KLE-NG supports only a small subset of HTML tags:

| Supported | Not Supported |
|-----------|---------------|
| `<br>` | `<h1>`–`<h6>` (use text size key properties instead) |
| `<b>`, `<strong>` | `<center>` (use center label positions instead) |
| `<i>`, `<em>` | Arbitrary CSS in label content |
| `<a>` | |
| `<ul>`, `<ol>`, `<li>` | |
| `<img>` | |
| `<svg>` | |

### Background Textures and CSS Label Styling

Background textures and highly customized CSS label styling are not supported. KLE-NG provides [minimal `css` metadata support](./custom-fonts) specifically for loading web fonts.

### Legacy Rendering Quirks

Edge cases and quirks from the original editor's rendering engine are not reproduced.

## `ta` Property (Text Alignment Colors)

KLE-NG uses the [kle-serial](https://github.com/adamws/kle-serial2) fork, which in version v0.18.0 introduced a new KLE property type `'ta'` as a solution for color handling problems present in the original editor ([#344](https://github.com/ijprest/keyboard-layout-editor/issues/344), [#334](https://github.com/ijprest/keyboard-layout-editor/issues/334), [#315](https://github.com/ijprest/keyboard-layout-editor/issues/315), [#214](https://github.com/ijprest/keyboard-layout-editor/issues/214)).

The `'ta'` property follows the same semantics as the text size property `'fa'`. Layouts using `'ta'` can be opened with the legacy editor, but font colors will render differently there.

## Icon Compatibility

The original Keyboard Layout Editor supported two sets of internal icons usable as labels:

- **Font Awesome Icons** (v4.4.0) — e.g., `<i class='fa fa-github'></i>`
- **Keyboard-Layout-Editor Icons** — e.g., `<i class='kb kb-logo-windows-8'></i>`

These icon formats are **not supported** in KLE-NG. This method limits the icon choice to a fixed predefined set and ties appearance to internal CSS definitions. Instead, KLE-NG encourages using [inline SVGs](./canvas-editor#image-and-svg-labels), which make layouts self-contained and support any icon or graphic. See [#42](https://github.com/adamws/kle-ng/issues/42) for background.
