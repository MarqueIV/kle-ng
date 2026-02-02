/**
 * Type definitions for the Plate Generator feature
 */

/**
 * Available cutout types for switch plates.
 * Can be extended with additional types like 'alps', 'choc-v1', etc.
 */
export type CutoutType = 'cherry-mx-basic'

/**
 * Settings for plate generation
 */
export interface PlateSettings {
  cutoutType: CutoutType
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
 * Bounding box dimensions for the generated plate
 */
export interface PlateBoundingBox {
  /** Minimum X coordinate in mm */
  minX: number
  /** Minimum Y coordinate in mm */
  minY: number
  /** Maximum X coordinate in mm */
  maxX: number
  /** Maximum Y coordinate in mm */
  maxY: number
  /** Width of the bounding box in mm */
  width: number
  /** Height of the bounding box in mm */
  height: number
}

/**
 * Result of plate generation containing all export formats
 */
export interface PlateGenerationResult {
  /** SVG content as a string */
  svgContent: string
  /** DXF content as a string */
  dxfContent: string
  /** Bounding box dimensions */
  boundingBox: PlateBoundingBox
  /** Number of cutouts generated */
  cutoutCount: number
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
