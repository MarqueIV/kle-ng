import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { PlateSettings, GenerationState } from '@/types/plate'
import { buildPlate, PlateBuilderError } from '@/utils/plate/plate-builder'
import { validateFilletRadius, validateSizeAdjust } from '@/utils/plate/cutout-generator'
import { useKeyboardStore } from '@/stores/keyboard'

const STORAGE_KEY = 'kle-ng-plate-settings'

/**
 * Default plate settings
 */
const defaultSettings: PlateSettings = {
  cutoutType: 'cherry-mx-basic',
  filletRadius: 0.5,
  sizeAdjust: 0,
}

export const usePlateGeneratorStore = defineStore('plateGenerator', () => {
  // Settings state
  const settings = ref<PlateSettings>({ ...defaultSettings })

  // Generation state
  const generationState = ref<GenerationState>({
    status: 'idle',
    error: null,
    result: null,
  })

  /**
   * Generate a plate from the current keyboard layout
   */
  async function generatePlate(): Promise<void> {
    const keyboardStore = useKeyboardStore()

    // Set loading state (loading maker.js)
    generationState.value = {
      status: 'loading',
      error: null,
      result: null,
    }

    try {
      // Set generating state
      generationState.value.status = 'generating'

      // Get spacing from keyboard metadata
      const spacingX = keyboardStore.metadata.spacing_x || 19.05
      const spacingY = keyboardStore.metadata.spacing_y || 19.05

      // Build the plate
      const result = await buildPlate(keyboardStore.keys, {
        cutoutType: settings.value.cutoutType,
        filletRadius: settings.value.filletRadius,
        sizeAdjust: settings.value.sizeAdjust,
        spacingX,
        spacingY,
      })

      // Set success state
      generationState.value = {
        status: 'success',
        error: null,
        result,
      }
    } catch (error) {
      // Set error state
      let errorMessage = 'An unexpected error occurred while generating the plate.'

      if (error instanceof PlateBuilderError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        // Handle maker.js loading errors or other errors
        if (error.message.includes('timed out')) {
          errorMessage = 'Failed to load plate generation library. Please try again.'
        } else {
          errorMessage = error.message
        }
      }

      generationState.value = {
        status: 'error',
        error: errorMessage,
        result: null,
      }
    }
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
        // Merge with defaults to ensure new fields have default values
        // (backward compatibility for users with old localStorage data)
        settings.value = { ...defaultSettings, ...parsed }
      } catch (error) {
        console.warn('Failed to load plate settings:', error)
      }
    }
  }

  function saveSettings(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
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

  // Auto-refresh: regenerate plate when cutout settings change (only if already generated)
  const debouncedRegenerate = useDebounceFn(() => {
    if (
      generationState.value.status === 'success' &&
      !validateFilletRadius(settings.value.cutoutType, settings.value.filletRadius) &&
      !validateSizeAdjust(settings.value.cutoutType, settings.value.sizeAdjust)
    ) {
      generatePlate()
    }
  }, 300)
  watch(settings, debouncedRegenerate, { deep: true })

  // Load settings on store creation
  loadSettings()

  return {
    settings,
    generationState,
    generatePlate,
    resetGeneration,
    downloadSvg,
    downloadDxf,
  }
})
