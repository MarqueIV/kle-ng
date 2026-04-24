# Keyboard Metadata

The **Keyboard Metadata** panel stores layout-wide properties that are saved in the KLE JSON.

<img src="/keyboard-metadata-panel-light.png" class="docs-screenshot light-only" alt="Keyboard Metadata panel" />
<img src="/keyboard-metadata-panel-dark.png" class="docs-screenshot dark-only" alt="Keyboard Metadata panel" />

| Field                | Description                                                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**             | Layout name, used as the filename when exporting                                                                                                                                                    |
| **Author**           | Creator name, stored in the JSON                                                                                                                                                                    |
| **Background Color** | Canvas background color (supports transparency via alpha channel)                                                                                                                                   |
| **Border Radii**     | `border-radius` for background rectangle (default: `6px`). Accepts standard CSS syntax: `10px`, `5px 10px`, `10px 20px 30px 40px`. Affects canvas display and PNG export                            |
| **Spacing (mm/U)**   | Physical spacing between key centers in mm per U, for X and Y independently. Default is **19.05 mm** for both axes (Cherry MX standard). Change this for Kailh Choc (18 mm) or other switch pitches |
| **Notes**            | Free-text notes about the layout                                                                                                                                                                    |
| **CSS**              | Custom CSS for loading web fonts. See [Custom Fonts & CSS](./custom-fonts)                                                                                                                          |
| **QMK Metadata**     | QMK `info.json` metadata (keyboard name, manufacturer, processor, USB config, etc.). See [QMK Export](./import-export#qmk-export)                                                                   |
| **VIA Metadata**     | VIA/Vial JSON metadata. See [VIA & Vial Format](./via-and-metadata)                                                                                                                                 |
