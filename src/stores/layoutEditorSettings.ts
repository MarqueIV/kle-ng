import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'kle-ng-layout-editor-settings'

interface PersistedSettings {
  showGrid?: boolean
  highlightColor?: string
}

export const DEFAULT_HIGHLIGHT_COLOR = '#dc3545'

function loadFromStorage(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PersistedSettings
  } catch {
    // ignore
  }
  return {}
}

export const useLayoutEditorSettingsStore = defineStore('layoutEditorSettings', () => {
  const saved = loadFromStorage()

  const showGrid = ref<boolean>(saved.showGrid ?? false)
  const highlightColor = ref<string>(saved.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR)

  watch(showGrid, (val) => {
    const current = loadFromStorage()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, showGrid: val }))
  })

  watch(highlightColor, (val) => {
    const current = loadFromStorage()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, highlightColor: val }))
  })

  return { showGrid, highlightColor }
})
