/**
 * Lazy loader for maker.js module
 * This wrapper dynamically imports maker.js after the initial app render
 * to reduce the critical bundle size.
 */

import type MakerJs from 'makerjs'

// Import timeout in milliseconds (30 seconds)
const IMPORT_TIMEOUT = 30000

// Loading state
let loadingPromise: Promise<typeof MakerJs> | null = null
let loadedModule: typeof MakerJs | null = null

/**
 * Preload the maker.js module after initial render
 * Call this from the PlateGeneratorPanel on mount
 */
export function preloadMakerJsModule(): void {
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(
      () => {
        loadMakerJsModule().catch((error) => {
          console.warn('Failed to preload maker.js module:', error)
        })
      },
      { timeout: 2000 }, // Fallback to setTimeout after 2s
    )
  } else {
    setTimeout(() => {
      loadMakerJsModule().catch((error) => {
        console.warn('Failed to preload maker.js module:', error)
      })
    }, 100)
  }
}

/**
 * Load the maker.js module dynamically
 * Returns a promise that resolves with the module or rejects on timeout
 */
async function loadMakerJsModule(): Promise<typeof MakerJs> {
  // If already loaded, return immediately
  if (loadedModule) {
    return loadedModule
  }

  // If loading is in progress, wait for it
  if (loadingPromise) {
    return loadingPromise
  }

  // Start loading
  loadingPromise = Promise.race([
    import('makerjs').then((module) => {
      // maker.js exports default module
      loadedModule = module.default || module
      return loadedModule
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Maker.js module import timed out after ${IMPORT_TIMEOUT}ms`))
      }, IMPORT_TIMEOUT)
    }),
  ]).finally(() => {
    // Clear loading state when done (success or failure)
    loadingPromise = null
  })

  return loadingPromise
}

/**
 * Get the maker.js module (lazy-loaded)
 * This is the main entry point for plate generation
 */
export async function getMakerJs(): Promise<typeof MakerJs> {
  return loadMakerJsModule()
}

/**
 * Check if maker.js is already loaded
 */
export function isMakerJsLoaded(): boolean {
  return loadedModule !== null
}
