/**
 * Type definitions for the Plate Generator feature
 */

/**
 * Available cutout types for switch plates.
 */
export type CutoutType =
  | 'cherry-mx-basic'
  | 'alps-skcm'
  | 'alps-skcp'
  | 'kailh-choc-cpg1350'
  | 'kailh-choc-cpg1232'
  | 'custom-rectangle'

/**
 * Available stabilizer cutout types.
 */
export type StabilizerType = 'mx-basic' | 'mx-spec' | 'mx-spec-narrow' | 'none'

/**
 * Settings for plate outline generation
 */
export interface OutlineSettings {
  /** Whether outline generation is enabled */
  enabled: boolean
  /** Top margin in mm */
  marginTop: number
  /** Bottom margin in mm */
  marginBottom: number
  /** Left margin in mm */
  marginLeft: number
  /** Right margin in mm */
  marginRight: number
}

/**
 * Settings for plate generation
 */
export interface PlateSettings {
  cutoutType: CutoutType
  /** Stabilizer cutout type. 'none' disables stabilizer cutouts. */
  stabilizerType: StabilizerType
  /** Fillet (corner rounding) radius in mm for switch cutouts. 0 = sharp corners. */
  filletRadius: number
  /** Fillet (corner rounding) radius in mm for stabilizer cutouts. 0 = sharp corners. */
  stabilizerFilletRadius: number
  /** Size adjustment in mm. Positive = shrink cutouts, negative = expand. */
  sizeAdjust: number
  /** Custom cutout width in mm (used when cutoutType is 'custom-rectangle'). */
  customCutoutWidth: number
  /** Custom cutout height in mm (used when cutoutType is 'custom-rectangle'). */
  customCutoutHeight: number
  /** Merge overlapping cutouts into simplified paths. */
  mergeCutouts: boolean
  /** Outline generation settings */
  outline: OutlineSettings
}

/**
 * Position and rotation data for a single key cutout
 */
export interface KeyCutoutPosition {
  /** X center position in mm */
  centerX: number
  /** Y center position in mm (already transformed for maker.js coordinate system) */
  centerY: number
  /** Rotation angle in degrees (already negated for maker.js) */
  rotationAngle: number
  /** Cutout width in mm */
  width: number
  /** Cutout height in mm */
  height: number
}

/**
 * Result of plate generation containing all export formats
 */
export interface PlateGenerationResult {
  /** SVG content for preview (uses 100% dimensions to avoid scaling artifacts) */
  svgPreview: string
  /** SVG content for download (uses mm units for CAD software) */
  svgDownload: string
  /** DXF content as a string */
  dxfContent: string
  /** SVG content for outline preview (optional, only when outline enabled) */
  outlineSvgPreview?: string
  /** SVG content for outline download (optional, only when outline enabled) */
  outlineSvgDownload?: string
  /** DXF content for outline (optional, only when outline enabled) */
  outlineDxfContent?: string
}

/**
 * Generation status for UI state management
 */
export type GenerationStatus = 'idle' | 'loading' | 'generating' | 'success' | 'error'

/**
 * Generation state including status, error message, and result
 */
export interface GenerationState {
  status: GenerationStatus
  error: string | null
  result: PlateGenerationResult | null
}

/**
 * Option for cutout type dropdown
 */
export interface CutoutOption {
  value: CutoutType
  label: string
  description: string
}

/**
 * Option for stabilizer type dropdown
 */
export interface StabilizerOption {
  value: StabilizerType
  label: string
  description: string
}
