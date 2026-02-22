/** Per-key data needed by any layout renderer */
export interface KeyRenderData {
  left: number
  top: number
  width: number
  height: number
  topLeftLabel: string
  bottomLeftLabel: string
  darkColor: string // key.color (outer/bevel fill), e.g. '#cccccc'
  lightColor: string // lightenColor(darkColor), e.g. '#f0f0f0'
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
