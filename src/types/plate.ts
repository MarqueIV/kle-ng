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

/**
 * Settings for plate generation
 */
export interface PlateSettings {
  cutoutType: CutoutType
  /** Fillet (corner rounding) radius in mm for cutouts. 0 = sharp corners. */
  filletRadius: number
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
