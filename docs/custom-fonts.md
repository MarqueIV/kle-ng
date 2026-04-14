# Custom Fonts & CSS

## CSS Metadata {#css-import}

The original [Keyboard Layout Editor](https://www.keyboard-layout-editor.com/) provided [fine-grained](https://github.com/ijprest/keyboard-layout-editor/wiki/Custom-Styles) control over keyboard CSS style via a `css` metadata field defined in a layout. This allows using any web font (like Google Fonts) for key label rendering.

When you import a KLE layout that contains CSS metadata, kle-ng displays that value in the **CSS** field of the **Keyboard Metadata** panel.

## Supported CSS Features {#supported-syntax}

kle-ng supports only a minimal subset of CSS for loading fonts:

```css
@import url(https://fonts.googleapis.com/css2?family=Noto+Sans+JP);
```

The font name is automatically extracted from the URL and applied globally to all canvas text.

::: info
It is not possible to define different fonts for different key labels — the font applies to all labels on all keys.

All other CSS expressions are ignored and have no effect.
:::

## Adding a Custom Font

1. Open the **Keyboard Metadata** panel
2. In the **CSS** field, add an `@import` statement with your Google Fonts URL
3. The font name is automatically extracted and applied to canvas rendering

**Example — adding Noto Sans JP:**

```css
@import url(https://fonts.googleapis.com/css2?family=Noto+Sans+JP);
```

This is especially useful for layouts with international characters, special symbols, or stylistic typography.

![Keyboard with Japanese font](/keyboard-layout-iso-jis-tkl.png){.docs-screenshot}

_Above: A JIS TKL layout rendered with Noto Sans JP on a system without Japanese fonts installed._

## Finding Google Fonts URLs

1. Go to [fonts.google.com](https://fonts.google.com/) and select a font.
2. Click **Get font**, then **Get embed code**.
3. Copy the URL from the `@import` line shown (e.g., `https://fonts.googleapis.com/css2?family=Roboto+Mono`).
4. Paste it into the CSS field as shown in the example above.

::: info
The font loads from Google's servers when the layout is opened. If the browser cannot reach Google Fonts (e.g., in certain regions or behind a firewall), the fallback system font is used instead.
:::

## Troubleshooting

**Font doesn't appear after adding the CSS** — The font is applied when the CSS field loses focus (on blur). Click outside the CSS text area to trigger the load. A notification appears when the font is applied successfully.

**Labels still show the system font** — Check that the `@import` URL is correct and that the family name in the URL matches exactly. If you typed the font name manually, ensure capitalization and spacing match the Google Fonts URL format (e.g., `Noto+Sans+JP` not `Noto Sans JP`).

**Different fonts for different keys are not possible** — kle-ng applies one font globally. If you need mixed scripts (e.g., Latin and Japanese on the same layout), choose a font that supports both character ranges, such as Noto Sans.

## CSS Metadata in KLE Export

The CSS field value is preserved when exporting to KLE JSON format. This means layouts with custom fonts remain compatible with other KLE-based tools.
