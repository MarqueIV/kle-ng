import type { Keyboard } from '@adamws/kle-serial'

/**
 * Lazy loader for ergogen-converter module
 * This wrapper dynamically imports ergogen-converter and its dependencies
 * after the initial app render to reduce the critical bundle size.
 */

// Import timeout in milliseconds (30 seconds)
const IMPORT_TIMEOUT = 30000

// Loading state
let loadingPromise: Promise<typeof import('./ergogen-converter')> | null = null
let loadedModule: typeof import('./ergogen-converter') | null = null

/**
 * Preload the ergogen module after initial render
 * Call this from the main app after the first render completes
 */
export function preloadErgogenModule(): void {
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(
      () => {
        loadErgogenModule().catch((error) => {
          console.warn('Failed to preload ergogen module:', error)
        })
      },
      { timeout: 2000 }, // Fallback to setTimeout after 2s
    )
  } else {
    setTimeout(() => {
      loadErgogenModule().catch((error) => {
        console.warn('Failed to preload ergogen module:', error)
      })
    }, 100)
  }
}

/**
 * Load the ergogen-converter module dynamically
 * Returns a promise that resolves with the module or rejects on timeout
 */
async function loadErgogenModule(): Promise<typeof import('./ergogen-converter')> {
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
    import('./ergogen-converter').then((module) => {
      loadedModule = module
      return module
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Ergogen module import timed out after ${IMPORT_TIMEOUT}ms`))
      }, IMPORT_TIMEOUT)
    }),
  ]).finally(() => {
    // Clear loading state when done (success or failure)
    loadingPromise = null
  })

  return loadingPromise
}

/**
 * Parse ergogen config and convert to keyboard layout
 * This is a lazy-loaded wrapper for parseErgogenConfig
 */
export async function parseErgogenConfig(config: string): Promise<Keyboard> {
  const module = await loadErgogenModule()
  return module.parseErgogenConfig(config)
}

/**
 * Encode keyboard to ergogen.xyz URL
 * This is a lazy-loaded wrapper for encodeKeyboardToErgogenUrl
 */
export async function encodeKeyboardToErgogenUrl(keyboard: Keyboard): Promise<string> {
  const module = await loadErgogenModule()
  return module.encodeKeyboardToErgogenUrl(keyboard)
}

/**
 * Get ergogen points from config
 * This is a lazy-loaded wrapper for ergogenGetPoints
 */
export async function ergogenGetPoints(
  config: unknown,
): Promise<import('./ergogen-converter').ErgogenPoints> {
  const module = await loadErgogenModule()
  return module.ergogenGetPoints(config)
}

/**
 * Convert ergogen points to keyboard
 * This is a lazy-loaded wrapper for ergogenPointsToKeyboard
 */
export async function ergogenPointsToKeyboard(
  points: import('./ergogen-converter').ErgogenPoints,
): Promise<Keyboard> {
  const module = await loadErgogenModule()
  return module.ergogenPointsToKeyboard(points)
}
