import type { Key } from '@adamws/kle-serial'
import type { ThemeRule, Theme, ThemeColorAssignment } from '@/types/theme'
import { compileMatchers } from './matcher-parser'

function ruleMatchesKey(key: Key, rule: ThemeRule): boolean {
  if (!rule.matchers || rule.matchers.trim() === '') return true
  return compileMatchers(rule.matchers)(key)
}

/**
 * Evaluate all theme rules for a single key.
 * Rules are applied in order; later rules overwrite earlier ones (last-match-wins).
 * `textColors` sub-objects are merged per-position across all matching rules.
 */
export function evaluateThemeForKey(key: Key, theme: Theme): ThemeColorAssignment {
  let merged: ThemeColorAssignment = {}
  for (const rule of theme.rules) {
    if (ruleMatchesKey(key, rule)) {
      const { textColors, ...rest } = rule.colors
      merged = { ...merged, ...rest }
      if (textColors) {
        merged.textColors = { ...(merged.textColors ?? {}), ...textColors }
      }
    }
  }
  return merged
}

/**
 * Apply a ThemeColorAssignment onto a Key (mutates the key).
 * Call keyboardStore.saveState() after applying to all target keys.
 */
export function applyAssignmentToKey(key: Key, assignment: ThemeColorAssignment): void {
  if (assignment.color !== undefined) {
    key.color = assignment.color
  }
  if (assignment.defaultTextColor !== undefined) {
    key.default.textColor = assignment.defaultTextColor
  }
  if (assignment.textColors) {
    for (const [idx, color] of Object.entries(assignment.textColors)) {
      const index = Number(idx)
      if (index >= 0 && index < 12 && color !== undefined) {
        key.textColor[index] = color
      }
    }
  }
}
