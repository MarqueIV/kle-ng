/**
 * Lazy loader for Three.js modules
 * Mirrors the pattern in makerjs-loader.ts: singleton cache, shared in-flight promise,
 * 30s timeout, and .finally() reset so a failed load allows retry.
 */

import type * as THREE from 'three'
import type { STLLoader as STLLoaderType } from 'three/examples/jsm/loaders/STLLoader.js'
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js'

export interface ThreeModules {
  THREE: typeof THREE
  STLLoader: typeof STLLoaderType
  OrbitControls: typeof OrbitControlsType
}

const LOAD_TIMEOUT_MS = 30_000

let loadedModules: ThreeModules | null = null
let loadingPromise: Promise<ThreeModules> | null = null

/**
 * Preload Three.js modules after initial render.
 * Call this from PlateGeneratorPanel on mount.
 */
export function preloadThreeModule(): void {
  const cb = () => {
    getThree().catch((err) => {
      console.warn('Failed to preload Three.js modules:', err)
    })
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(cb, { timeout: 2000 })
  } else {
    setTimeout(cb, 100)
  }
}

/**
 * Check if Three.js modules are already loaded.
 */
export function isThreeLoaded(): boolean {
  return loadedModules !== null
}

/**
 * Get Three.js modules (lazy-loaded).
 * Returns cached modules if available; otherwise initiates load with timeout.
 */
export async function getThree(): Promise<ThreeModules> {
  if (loadedModules) return loadedModules
  if (loadingPromise) return loadingPromise

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Three.js load timed out after ${LOAD_TIMEOUT_MS}ms`)),
      LOAD_TIMEOUT_MS,
    ),
  )

  loadingPromise = Promise.race([
    Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/STLLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([threeModule, { STLLoader }, { OrbitControls }]) => {
      loadedModules = { THREE: threeModule, STLLoader, OrbitControls }
      return loadedModules
    }),
    timeout,
  ]).finally(() => {
    // Clear so retry is possible after failure
    if (!loadedModules) loadingPromise = null
  }) as Promise<ThreeModules>

  return loadingPromise
}
