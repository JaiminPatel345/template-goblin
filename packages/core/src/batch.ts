import { fork } from 'node:child_process'
import { cpus } from 'node:os'
import type { LoadedTemplate, InputJSON } from '@template-goblin/types'
import { generatePDF } from './generate.js'

/** Options for batch PDF generation */
export interface BatchOptions {
  /** Maximum concurrent child processes (defaults to CPU count) */
  concurrency?: number
  /** Use child processes for parallel generation (default: true). Set false to use in-process generation. */
  parallel?: boolean
  /** Path to the batch worker script. Required when parallel=true. */
  workerPath?: string
  /** Callback fired when each PDF completes, with its index */
  onProgress?: (index: number, total: number) => void
}

/** Result of a single PDF generation in a batch */
export interface BatchResult {
  index: number
  success: boolean
  pdf?: Buffer
  error?: string
}

/**
 * Serializable representation of LoadedTemplate for IPC.
 * Maps are converted to arrays of [key, base64-value] tuples.
 */
interface SerializedTemplate {
  manifest: LoadedTemplate['manifest']
  backgroundImage: string | null
  fonts: [string, string][]
  placeholders: [string, string][]
}

function serializeTemplate(template: LoadedTemplate): SerializedTemplate {
  return {
    manifest: template.manifest,
    backgroundImage: template.backgroundImage ? template.backgroundImage.toString('base64') : null,
    fonts: Array.from(template.fonts.entries()).map(([k, v]) => [k, v.toString('base64')]),
    placeholders: Array.from(template.placeholders.entries()).map(([k, v]) => [
      k,
      v.toString('base64'),
    ]),
  }
}

/** @internal Deserialize a template received via IPC */
export function deserializeTemplate(data: SerializedTemplate): LoadedTemplate {
  return {
    manifest: data.manifest,
    backgroundImage: data.backgroundImage ? Buffer.from(data.backgroundImage, 'base64') : null,
    fonts: new Map(data.fonts.map(([k, v]) => [k, Buffer.from(v, 'base64')])),
    placeholders: new Map(data.placeholders.map(([k, v]) => [k, Buffer.from(v, 'base64')])),
  }
}

/**
 * Generate multiple PDFs in parallel using child processes.
 *
 * Each child process receives a serialized LoadedTemplate and one InputJSON,
 * generates the PDF, and returns the Buffer.
 *
 * @param template - LoadedTemplate (loaded once, shared across all jobs)
 * @param dataArray - Array of InputJSON objects, one per PDF
 * @param options - Batch options (concurrency, progress callback)
 * @returns Array of BatchResult, one per input
 */
export async function generateBatchPDF(
  template: LoadedTemplate,
  dataArray: InputJSON[],
  options: BatchOptions = {},
): Promise<BatchResult[]> {
  const MAX_BATCH_SIZE = 10_000
  const { concurrency = cpus().length, parallel = true, onProgress, workerPath } = options

  if (dataArray.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch size ${dataArray.length} exceeds maximum of ${MAX_BATCH_SIZE}`)
  }

  if (!parallel || dataArray.length <= 1) {
    return generateBatchInProcess(template, dataArray, onProgress)
  }

  const serialized = serializeTemplate(template)
  const results: BatchResult[] = new Array(dataArray.length)
  let nextIndex = 0
  let completed = 0

  if (!workerPath) {
    throw new Error('workerPath is required when parallel=true. Pass the path to batch-worker.js.')
  }
  const resolvedWorkerPath: string = workerPath

  return new Promise((resolve) => {
    const maxWorkers = Math.min(concurrency, dataArray.length)

    function spawnNext() {
      if (nextIndex >= dataArray.length) return

      const index = nextIndex++
      const data = dataArray[index]

      const child = fork(resolvedWorkerPath, [], { serialization: 'json' })

      child.on('message', (msg: { success: boolean; pdf?: string; error?: string }) => {
        results[index] = {
          index,
          success: msg.success,
          pdf: msg.pdf ? Buffer.from(msg.pdf, 'base64') : undefined,
          error: msg.error,
        }

        completed++
        onProgress?.(completed, dataArray.length)

        if (completed === dataArray.length) {
          resolve(results)
        } else {
          spawnNext()
        }
      })

      child.on('error', (err) => {
        results[index] = { index, success: false, error: err.message }
        completed++
        onProgress?.(completed, dataArray.length)

        if (completed === dataArray.length) {
          resolve(results)
        } else {
          spawnNext()
        }
      })

      child.send({ template: serialized, data })
    }

    for (let i = 0; i < maxWorkers; i++) {
      spawnNext()
    }
  })
}

/**
 * In-process batch generation (no child processes). Used when parallel=false
 * or for small batches.
 */
async function generateBatchInProcess(
  template: LoadedTemplate,
  dataArray: InputJSON[],
  onProgress?: (index: number, total: number) => void,
): Promise<BatchResult[]> {
  const results: BatchResult[] = []

  for (let i = 0; i < dataArray.length; i++) {
    const data = dataArray[i]
    if (!data) {
      results.push({ index: i, success: false, error: 'Missing input data' })
      continue
    }
    try {
      const pdf = await generatePDF(template, data)
      results.push({ index: i, success: true, pdf })
    } catch (err) {
      results.push({
        index: i,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
    onProgress?.(i + 1, dataArray.length)
  }

  return results
}
