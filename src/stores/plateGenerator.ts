import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { PlateSettings, GenerationState, PlateGenerationResult } from '@/types/plate'
import {
  validateFilletRadius,
  validateStabilizerFilletRadius,
  validateCustomCutoutDimension,
} from '@/utils/plate/cutout-generator'
import { useKeyboardStore } from '@/stores/keyboard'
import type { PlateWorkerResponse } from '@/utils/plate/plate-worker'
import PlateWorker from '@/utils/plate/plate-worker?worker'

const STORAGE_KEY = 'kle-ng-plate-settings'

/**
 * Default plate settings
 */
const defaultSettings: PlateSettings = {
  cutoutType: 'cherry-mx-basic',
  stabilizerType: 'mx-basic',
  filletRadius: 0.5,
  stabilizerFilletRadius: 0.5,
  sizeAdjust: 0,
  customCutoutWidth: 14,
  customCutoutHeight: 14,
  mergeCutouts: false,
  outline: {
    enabled: false,
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 5,
    marginRight: 5,
    mergeWithCutouts: true,
    filletRadius: 1,
  },
  mountingHoles: {
    enabled: false,
    diameter: 3,
    edgeDistance: 3,
  },
  customHoles: {
    enabled: false,
    holes: [],
  },
}

export const usePlateGeneratorStore = defineStore('plateGenerator', () => {
  // Settings state
  const settings = ref<PlateSettings>({ ...defaultSettings })

  // Auto-refresh state (persisted separately from plate settings)
  const autoRefresh = ref(false)

  // Generation state
  const generationState = ref<GenerationState>({
    status: 'idle',
    error: null,
    result: null,
  })

  // Persistent worker instance (created lazily on first generate)
  let worker: Worker | null = null

  // Counter to ignore stale worker responses when a newer generation is in flight
  let generationId = 0

  // Cache of previously computed plate results, keyed by JSON-stringified options.
  // Cleared on layout change (requestRegenerate), so growth is naturally bounded.
  const cache = new Map<string, PlateGenerationResult>()

  function getWorker(): Worker {
    if (!worker) {
      worker = new PlateWorker()
    }
    return worker
  }

  /**
   * Generate a plate from the current keyboard layout.
   * Dispatches work to a Web Worker so the main thread stays responsive.
   */
  function generatePlate(): void {
    const keyboardStore = useKeyboardStore()

    // Get spacing from keyboard metadata
    const spacingX = keyboardStore.metadata.spacing_x || 19.05
    const spacingY = keyboardStore.metadata.spacing_y || 19.05

    // Serialize options once — used as both cache key and worker payload.
    const optionsJson = JSON.stringify({
      cutoutType: settings.value.cutoutType,
      stabilizerType: settings.value.stabilizerType,
      filletRadius: settings.value.filletRadius,
      stabilizerFilletRadius: settings.value.stabilizerFilletRadius,
      sizeAdjust: settings.value.sizeAdjust,
      customCutoutWidth: settings.value.customCutoutWidth,
      customCutoutHeight: settings.value.customCutoutHeight,
      mergeCutouts: settings.value.mergeCutouts,
      outline: settings.value.outline,
      mountingHoles: settings.value.mountingHoles,
      customHoles: settings.value.customHoles,
      spacingX,
      spacingY,
    })

    // Check cache — return instantly on hit
    const cached = cache.get(optionsJson)
    if (cached) {
      ++generationId // invalidate any in-flight worker response
      generationState.value = {
        status: 'success',
        error: null,
        result: cached,
      }
      return
    }

    // Preserve previous result so the UI can show it dimmed during regeneration
    const previousResult = generationState.value.result

    generationState.value = {
      status: 'generating',
      error: null,
      result: previousResult,
    }

    // Serialize reactive data to plain objects for postMessage.
    // JSON round-trip strips Vue Proxy wrappers that structuredClone cannot handle.
    const keys = JSON.parse(JSON.stringify(keyboardStore.keys))
    const options = JSON.parse(optionsJson)

    const currentId = ++generationId
    const w = getWorker()

    w.onmessage = (event: MessageEvent<PlateWorkerResponse>) => {
      // Ignore stale responses from a previous generation
      if (currentId !== generationId) return

      const data = event.data
      if (data.type === 'success') {
        cache.set(optionsJson, data.result)
        generationState.value = {
          status: 'success',
          error: null,
          result: data.result,
        }
      } else {
        generationState.value = {
          status: 'error',
          error: data.message,
          result: null,
        }
      }
    }

    w.onerror = (event: ErrorEvent) => {
      if (currentId !== generationId) return

      generationState.value = {
        status: 'error',
        error: event.message || 'An unexpected error occurred in the plate generation worker.',
        result: null,
      }
    }

    w.postMessage({ keys, options })
  }

  /**
   * Reset generation state to idle
   */
  function resetGeneration(): void {
    generationState.value = {
      status: 'idle',
      error: null,
      result: null,
    }
  }

  /**
   * Download the generated SVG
   */
  function downloadSvg(): void {
    const result = generationState.value.result
    if (!result) return

    downloadFile(result.svgDownload, 'keyboard-plate.svg', 'image/svg+xml')
  }

  /**
   * Download the generated DXF
   */
  function downloadDxf(): void {
    const result = generationState.value.result
    if (!result) return

    downloadFile(result.dxfContent, 'keyboard-plate.dxf', 'application/dxf')
  }

  /**
   * Download all SVG files (cutouts and outline if enabled)
   * If merge is enabled, downloads single combined file; otherwise separate files
   */
  function downloadAllSvg(): void {
    const result = generationState.value.result
    if (!result) return

    if (result.mergedSvgDownload) {
      // Merge enabled: download single combined file
      downloadFile(result.mergedSvgDownload, 'keyboard-plate.svg', 'image/svg+xml')
    } else {
      // Merge disabled: download separate files
      downloadFile(result.svgDownload, 'keyboard-plate.svg', 'image/svg+xml')

      if (result.outlineSvgDownload) {
        downloadFile(result.outlineSvgDownload, 'keyboard-plate-outline.svg', 'image/svg+xml')
      }
    }
  }

  /**
   * Download all DXF files (cutouts and outline if enabled)
   * If merge is enabled, downloads single combined file; otherwise separate files
   */
  function downloadAllDxf(): void {
    const result = generationState.value.result
    if (!result) return

    if (result.mergedDxfContent) {
      // Merge enabled: download single combined file
      downloadFile(result.mergedDxfContent, 'keyboard-plate.dxf', 'application/dxf')
    } else {
      // Merge disabled: download separate files
      downloadFile(result.dxfContent, 'keyboard-plate.dxf', 'application/dxf')

      if (result.outlineDxfContent) {
        downloadFile(result.outlineDxfContent, 'keyboard-plate-outline.dxf', 'application/dxf')
      }
    }
  }

  /**
   * Helper function to trigger file download
   */
  function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Settings persistence
  function loadSettings(): void {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        settings.value = {
          ...defaultSettings,
          ...parsed,
          outline: {
            ...defaultSettings.outline,
            ...parsed.outline,
          },
          mountingHoles: {
            ...defaultSettings.mountingHoles,
            ...parsed.mountingHoles,
          },
          customHoles: {
            ...defaultSettings.customHoles,
            ...parsed.customHoles,
          },
        }
      } catch (error) {
        console.warn('Failed to load plate settings:', error)
      }
    }
  }

  function saveSettings(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings.value }))
  }

  // Manual debounce helper
  function useDebounceFn<T extends (...args: unknown[]) => unknown>(fn: T, delay: number) {
    let timeoutId: number | null = null
    return (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => fn(...args), delay)
    }
  }

  // Watch settings for changes with debouncing (500ms) to prevent excessive writes
  const debouncedSave = useDebounceFn(saveSettings, 500)
  watch(settings, debouncedSave, { deep: true })

  /**
   * Check whether all settings are valid for regeneration.
   */
  function hasSettingsErrors(): boolean {
    const s = settings.value
    const cw = s.customCutoutWidth
    const ch = s.customCutoutHeight
    if (validateFilletRadius(s.cutoutType, s.filletRadius, cw, ch)) return true
    if (validateStabilizerFilletRadius(s.stabilizerType, s.stabilizerFilletRadius)) return true
    if (s.cutoutType === 'custom-rectangle') {
      const keyboardStore = useKeyboardStore()
      const sx = keyboardStore.metadata.spacing_x || 19.05
      const sy = keyboardStore.metadata.spacing_y || 19.05
      if (validateCustomCutoutDimension(cw, sx, 'width')) return true
      if (validateCustomCutoutDimension(ch, sy, 'height')) return true
    }
    return false
  }

  // Auto-refresh: regenerate plate when cutout settings change (only if already generated)
  const debouncedRegenerate = useDebounceFn(() => {
    if (generationState.value.status === 'success' && !hasSettingsErrors()) {
      generatePlate()
    }
  }, 300)
  watch(settings, debouncedRegenerate, { deep: true })

  // Persist autoRefresh changes and trigger generation when enabled
  watch(autoRefresh, (enabled) => {
    debouncedSave()
    if (enabled && generationState.value.status !== 'success' && !hasSettingsErrors()) {
      generatePlate()
    }
  })

  function clearCache(): void {
    cache.clear()
  }

  /**
   * Called by the keyboard store when the layout changes (saveState, undo, redo).
   * Clears the cache immediately (layout changed, all cached results are stale),
   * then debounces the actual regeneration.
   */
  const debouncedLayoutRegenerate = useDebounceFn(() => {
    if (autoRefresh.value && !hasSettingsErrors()) {
      generatePlate()
    }
  }, 500)

  function requestRegenerate(): void {
    clearCache()
    debouncedLayoutRegenerate()
  }

  // Load settings on store creation
  loadSettings()

  return {
    settings,
    autoRefresh,
    generationState,
    generatePlate,
    resetGeneration,
    requestRegenerate,
    downloadSvg,
    downloadDxf,
    downloadAllSvg,
    downloadAllDxf,
  }
})
