import { fork, type ChildProcess } from 'node:child_process'
import { cpus } from 'node:os'
import { TemplateGoblinError } from '@template-goblin/types'
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
  pageBackgrounds: [string, string][]
  fonts: [string, string][]
  placeholders: [string, string][]
  staticImages: [string, string][]
}

function serializeTemplate(template: LoadedTemplate): SerializedTemplate {
  return {
    manifest: template.manifest,
    backgroundImage: template.backgroundImage ? template.backgroundImage.toString('base64') : null,
    pageBackgrounds: Array.from(template.pageBackgrounds.entries()).map(([k, v]) => [
      k,
      v.toString('base64'),
    ]),
    fonts: Array.from(template.fonts.entries()).map(([k, v]) => [k, v.toString('base64')]),
    placeholders: Array.from(template.placeholders.entries()).map(([k, v]) => [
      k,
      v.toString('base64'),
    ]),
    staticImages: Array.from(template.staticImages.entries()).map(([k, v]) => [
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
    pageBackgrounds: new Map(
      (data.pageBackgrounds ?? []).map(([k, v]) => [k, Buffer.from(v, 'base64')]),
    ),
    fonts: new Map(data.fonts.map(([k, v]) => [k, Buffer.from(v, 'base64')])),
    placeholders: new Map(data.placeholders.map(([k, v]) => [k, Buffer.from(v, 'base64')])),
    staticImages: new Map((data.staticImages ?? []).map(([k, v]) => [k, Buffer.from(v, 'base64')])),
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
    throw new TemplateGoblinError(
      'INVALID_ARGUMENT',
      `Batch size ${dataArray.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
    )
  }

  if (!parallel || dataArray.length <= 1) {
    return generateBatchInProcess(template, dataArray, onProgress)
  }

  const serialized = serializeTemplate(template)
  const results: BatchResult[] = new Array(dataArray.length)
  let nextIndex = 0
  let completed = 0

  if (!workerPath) {
    throw new TemplateGoblinError(
      'INVALID_ARGUMENT',
      'workerPath is required when parallel=true. Pass the path to batch-worker.js.',
    )
  }
  const resolvedWorkerPath: string = workerPath

  // Persistent worker pool. PRE-FIX this forked a brand-new process PER PDF
  // (fork + Node startup + PDFKit module load + template deserialize ≈ 300ms
  // each), so a 1000-PDF batch paid ~5 minutes of pure startup overhead.
  // Now we fork `maxWorkers` long-lived workers ONCE, hand each the
  // serialized template a single time, and stream jobs to whichever worker
  // is free — the heavy per-process setup happens `maxWorkers` times total
  // instead of `dataArray.length` times.
  return new Promise<BatchResult[]>((resolve) => {
    const maxWorkers = Math.min(concurrency, dataArray.length)
    // Job index each worker is currently processing (-1 = idle / none).
    const inFlight = new WeakMap<ChildProcess, number>()
    const finished = new WeakSet<ChildProcess>() // guards exit/error double-cleanup
    let aliveWorkers = 0

    function recordResult(index: number, result: BatchResult): void {
      if (results[index] !== undefined) return // settle-once per job
      results[index] = result
      completed++
      onProgress?.(completed, dataArray.length)
      if (completed === dataArray.length) resolve(results)
    }

    // Give a ready worker the next queued job, or shut it down when the
    // queue is drained. Jobs carry ONLY data — the template was sent once
    // at init and is cached inside the worker.
    function assign(child: ChildProcess): void {
      if (nextIndex >= dataArray.length) {
        inFlight.set(child, -1)
        child.send({ type: 'shutdown' })
        return
      }
      const index = nextIndex++
      inFlight.set(child, index)
      child.send({ type: 'job', index, data: dataArray[index] })
    }

    // If the pool empties while jobs remain (e.g. every worker died at
    // init), nothing can make progress — fail the unfinished jobs so the
    // batch always settles instead of hanging.
    function drainIfStuck(): void {
      if (aliveWorkers > 0 || completed >= dataArray.length) return
      for (let i = 0; i < dataArray.length; i++) {
        recordResult(i, {
          index: i,
          success: false,
          error: 'All worker processes exited before this job could be processed',
        })
      }
    }

    function cleanup(child: ChildProcess): void {
      if (finished.has(child)) return
      finished.add(child)
      aliveWorkers--
      const idx = inFlight.get(child) ?? -1
      inFlight.delete(child)
      // A job mid-flight when the worker died → fail it (settle-once guards
      // against a result that already arrived just before the exit).
      if (idx >= 0) {
        recordResult(idx, { index: idx, success: false, error: 'Worker exited before replying' })
      }
      drainIfStuck()
    }

    function spawn(): void {
      const child = fork(resolvedWorkerPath, [], { serialization: 'json' })
      aliveWorkers++
      inFlight.set(child, -1)

      child.on('message', (msg: WorkerToMain) => {
        if (msg.type === 'ready') {
          assign(child)
          return
        }
        const idx = inFlight.get(child) ?? -1
        if (idx >= 0) {
          recordResult(idx, {
            index: idx,
            success: msg.success,
            pdf: msg.pdf ? Buffer.from(msg.pdf, 'base64') : undefined,
            error: msg.error,
          })
        }
        assign(child)
      })

      child.on('error', () => cleanup(child))
      child.on('exit', () => cleanup(child))

      child.send({ type: 'init', template: serialized })
    }

    for (let i = 0; i < maxWorkers; i++) spawn()
  })
}

/** Message a worker sends back to the pool. */
type WorkerToMain =
  | { type: 'ready' }
  | { type: 'result'; success: boolean; pdf?: string; error?: string }

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
