import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Theme } from '@/types/theme'
import { BUILTIN_THEMES } from '@/data/builtinThemes'
import { evaluateThemeForKey, applyAssignmentToKey } from '@/utils/theme-engine'
import { useKeyboardStore } from './keyboard'

export const useThemeToolsStore = defineStore('themeTools', () => {
  const activeBuiltinIndex = ref<number | null>(0)
  const customTheme = ref<Theme | null>(null)

  const currentTheme = computed<Theme | null>(() => {
    if (customTheme.value) return customTheme.value
    if (activeBuiltinIndex.value !== null) {
      return BUILTIN_THEMES[activeBuiltinIndex.value] ?? null
    }
    return null
  })

  const isCustomTheme = computed(() => customTheme.value !== null)

  function selectBuiltinTheme(index: number) {
    customTheme.value = null
    activeBuiltinIndex.value = index
  }

  function loadCustomTheme(theme: Theme) {
    customTheme.value = theme
    activeBuiltinIndex.value = null
  }

  /**
   * Validate and parse a JSON string as a Theme.
   * Throws a descriptive Error on invalid input.
   */
  function parseThemeJson(json: string): Theme {
    const parsed = JSON.parse(json) as Partial<Theme>
    if (!parsed.name) throw new Error('Theme must have a "name" field')
    if (!Array.isArray(parsed.rules)) throw new Error('Theme must have a "rules" array')
    for (let i = 0; i < parsed.rules.length; i++) {
      const rule = parsed.rules[i]!
      if (!rule.name) throw new Error(`Rule ${i} must have a "name" field`)
      if (!rule.colors || typeof rule.colors !== 'object')
        throw new Error(`Rule ${i} must have a "colors" object`)
    }
    return parsed as Theme
  }

  /**
   * Apply the current theme to keys.
   * If applyToSelected is true and keys are selected, only applies to selected keys.
   * Otherwise applies to all keys. Creates a single undo history entry.
   */
  function applyTheme() {
    const theme = currentTheme.value
    if (!theme) return

    const keyboardStore = useKeyboardStore()

    if (theme.backgroundColor !== undefined) {
      keyboardStore.metadata.backcolor = theme.backgroundColor
    }

    try {
      for (const key of keyboardStore.keys) {
        const assignment = evaluateThemeForKey(key, theme)
        applyAssignmentToKey(key, assignment)
      }
    } finally {
      keyboardStore.saveState()
    }
  }

  /** Export the current theme as a formatted JSON string. */
  function exportThemeJson(): string {
    return JSON.stringify(currentTheme.value, null, 2)
  }

  return {
    activeBuiltinIndex,
    customTheme,
    currentTheme,
    isCustomTheme,
    builtinThemes: BUILTIN_THEMES,
    selectBuiltinTheme,
    loadCustomTheme,
    parseThemeJson,
    applyTheme,
    exportThemeJson,
  }
})
