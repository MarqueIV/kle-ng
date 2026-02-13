/**
 * Web Worker for plate generation.
 *
 * Runs buildPlate() off the main thread so the UI remains responsive
 * during heavy geometry computation (cutout positioning, boolean merges,
 * SVG/DXF export).
 */

import type { Key } from '@adamws/kle-serial'
import type { PlateGenerationResult } from '@/types/plate'
import { buildPlate, PlateBuilderError } from './plate-builder'
import type { PlateBuilderOptions } from './plate-builder'

export interface PlateWorkerRequest {
  keys: Key[]
  options: PlateBuilderOptions
}

export interface PlateWorkerSuccessResponse {
  type: 'success'
  result: PlateGenerationResult
}

export interface PlateWorkerErrorResponse {
  type: 'error'
  message: string
}

export type PlateWorkerResponse = PlateWorkerSuccessResponse | PlateWorkerErrorResponse

self.onmessage = async (event: MessageEvent<PlateWorkerRequest>) => {
  const { keys, options } = event.data

  try {
    const result = await buildPlate(keys, options)
    const response: PlateWorkerSuccessResponse = { type: 'success', result }
    self.postMessage(response)
  } catch (error) {
    let message = 'An unexpected error occurred while generating the plate.'

    if (error instanceof PlateBuilderError) {
      message = error.message
    } else if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        message = 'Failed to load plate generation library. Please try again.'
      } else {
        message = error.message
      }
    }

    const response: PlateWorkerErrorResponse = { type: 'error', message }
    self.postMessage(response)
  }
}
