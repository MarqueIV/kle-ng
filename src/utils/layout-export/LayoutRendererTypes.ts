/** Per-key data needed by any layout renderer */
export interface KeyRenderData {
  left: number
  top: number
  width: number
  height: number
  topLeftLabel: string
  bottomLeftLabel: string
}

/** Normalized input consumed by any layout renderer */
export interface LayoutRenderInput {
  layoutName: string
  author: string
  backColor: string
  radiiValue: string
  unit: number
  boardWidth: number
  boardHeight: number
  keys: KeyRenderData[]
}

/** Contract that all layout renderers must satisfy */
export interface LayoutRenderer {
  render(input: LayoutRenderInput): string
}
