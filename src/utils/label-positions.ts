export interface LabelPosition {
  /** Horizontal alignment (left, center, right) */
  align: 'left' | 'center' | 'right'
  /** Vertical baseline (hanging, middle, alphabetic) */
  baseline: 'hanging' | 'middle' | 'alphabetic'
}

/**
 * Label positioning grid matching original KLE (12 positions).
 * Defines how labels are aligned and positioned in the 3x3 grid on key top
 * plus the 3 front legend positions.
 */
export const LABEL_POSITIONS: LabelPosition[] = [
  // Top row
  { align: 'left', baseline: 'hanging' }, // 0: top-left
  { align: 'center', baseline: 'hanging' }, // 1: top-center
  { align: 'right', baseline: 'hanging' }, // 2: top-right

  // Center row
  { align: 'left', baseline: 'middle' }, // 3: center-left
  { align: 'center', baseline: 'middle' }, // 4: center
  { align: 'right', baseline: 'middle' }, // 5: center-right

  // Bottom row
  { align: 'left', baseline: 'alphabetic' }, // 6: bottom-left
  { align: 'center', baseline: 'alphabetic' }, // 7: bottom-center
  { align: 'right', baseline: 'alphabetic' }, // 8: bottom-right

  // Front legends (side print)
  { align: 'left', baseline: 'hanging' }, // 9: front-left
  { align: 'center', baseline: 'hanging' }, // 10: front-center
  { align: 'right', baseline: 'hanging' }, // 11: front-right
]
