export interface ThemeColorAssignment {
  /** Keycap background color (hex, e.g. "#cccccc") */
  color?: string
  /** Default text color for all labels */
  defaultTextColor?: string
  /** Per-label-position text color overrides (sparse — only positions you want to set) */
  textColors?: Partial<Record<number, string>>
}

export interface ThemeRule {
  /** Human-readable rule name shown in the panel */
  name: string
  /**
   * Matcher expression string. Omit or leave empty to match every key (default/fallback rule).
   *
   * Syntax:
   *   Properties  : width  height  x  y  rotation
   *   Flags       : decal  ghost  stepped  nub
   *   Operators   : >  >=  <  <=  ==  !=
   *   Label check : label == "Esc"   label[0] matches "^F\d+$"   label contains "Shift"
   *   Logic       : and  or  not  ( )
   *
   * Examples:
   *   "width >= 1.5"
   *   "width >= 6 and not decal"
   *   "label matches \"^F\\d+$\""
   *   "ghost or stepped"
   *   "not (ghost or decal)"
   */
  matchers?: string
  /** Color assignments applied when this rule matches */
  colors: ThemeColorAssignment
}

export interface Theme {
  /** Display name */
  name: string
  /** Keyboard background color (hex, e.g. "#eeeeee") */
  backgroundColor?: string
  /**
   * Ordered list of rules.
   * First rule = lowest priority, last rule = highest priority (last-match-wins cascade).
   * Put the default/fallback rule first (no matchers); specific overrides last.
   */
  rules: ThemeRule[]
}
