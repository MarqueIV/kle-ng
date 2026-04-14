# PCB Generator

The PCB Generator creates [KiCad](https://kicad.org) project files from your keyboard layout. It generates a key matrix schematic, places switch and diode footprints according to key positions, and can optionally route connections between components.

## Overview {#overview}

Open the **PCB Generator** panel in the right sidebar. The panel displays a footprint preview and generation controls.

## Prerequisites {#prerequisites}

Before generating a PCB, your layout must have:

- **Matrix coordinates** — Each key must have row/column assignments in VIA label format (e.g., `0,0` for row 0, column 0). Use **Extra Tools → Add Switch Matrix Coordinates** if not already set. See [Add Switch Matrix Coordinates](./canvas-editor#extra-tools) for instructions.
- **Maximum 150 keys** — Layouts with more than 150 keys are not supported.

Matrix coordinates determine how switches are wired in the keyboard matrix.

![VIA layout example showing matrix coordinates](/via-layout-example.png){.docs-screenshot}

## Matrix Coordinates {#matrix-coordinates}

Matrix coordinates in KLE-NG use VIA label format. Each key's top-left label contains the row and column assignment as `row,col` (e.g., `0,0`, `0,1`, `1,0`).

The easiest way to assign matrix coordinates is to use **Extra Tools → Add Switch Matrix Coordinates**, which can annotate your layout automatically or let you draw rows and columns manually.

## Generating a PCB {#generating}

1. Verify your layout has matrix coordinates assigned
2. Open the **PCB Generator** panel
3. Configure switch, diode, and routing options as needed
4. Use the preview window to check key-diode placement

   ![PCB footprints preview](/pcb-generator-footprints-preview.png){.docs-screenshot}

5. Click **Generate PCB**
6. Wait for the server to process your layout
7. Once complete, preview renders will be displayed
8. Click **Download** to save the `.kicad_pcb` file, or **New Task** to start over

> **Note:** The preview does not support displaying traces.

## Tips

- **Download expiration** — Generated PCB files expire after **1 hour**.
- **Rate limiting** — There is a 5-second cooldown between generation requests.
- **Worker status** — The PCB generator runs on a remote worker. If the service is temporarily unavailable, try again later.
- **KiCad compatibility** — Generated files are compatible with **KiCad 9+**. Open the file in KiCad to add mounting holes, USB connector, microcontroller, and other components.

> **Privacy note:** This feature sends your layout data to a backend server for processing. Generated files are stored for 1 hour and then automatically deleted. No data is used for any other purposes.
