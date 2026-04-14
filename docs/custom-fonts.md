# Custom Fonts & CSS

## CSS Metadata {#css-import}

The original [Keyboard Layout Editor](https://www.keyboard-layout-editor.com/) provided [fine-grained](https://github.com/ijprest/keyboard-layout-editor/wiki/Custom-Styles) control over keyboard CSS style via a `css` metadata field defined in a layout. This allows using any web font (like Google Fonts) for key label rendering.

When you import a KLE layout that contains CSS metadata, KLE-NG displays that value in the **CSS** field of the **Keyboard Metadata** panel.

## Supported CSS Features {#supported-syntax}

KLE-NG supports only a minimal subset of CSS for loading fonts:

```css
@import url(https://fonts.googleapis.com/css2?family=Noto+Sans+JP);
```

The font name is automatically extracted from the URL and applied globally to all canvas text.

> **Note:** It is not possible to define different fonts for different key labels — the font applies to all labels on all keys.
>
> All other CSS expressions are ignored and have no effect.

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

*Above: A JIS TKL layout rendered with Noto Sans JP on a system without Japanese fonts installed.*

## CSS Metadata in KLE Export

The CSS field value is preserved when exporting to KLE JSON format. This means layouts with custom fonts remain compatible with other KLE-based tools.
