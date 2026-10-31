/**
 * Persistent worker for batch PDF generation.
 *
 * The pool sends ONE `init` message carrying the serialized template, which
 * the worker deserializes once and caches for its whole lifetime. It then
 * processes a stream of `job` messages (data only) until the pool sends
 * `shutdown`. PRE-FIX a fresh worker was forked per PDF and deserialized
 * the template every time — see `batch.ts` for the rationale.
 *
 * Protocol:
 *   main → worker:  { type: 'init', template }
 *                   { type: 'job', index, data }
 *                   { type: 'shutdown' }
 *   worker → main:  { type: 'ready' }
 *                   { type: 'result', success, pdf? , error? }
 *
 * A per-DATA failure (bad input, render error) is reported as a failed
 * result and the worker STAYS ALIVE for the next job — only `shutdown`
 * (or an unrecoverable crash) ends the process.
 */
import type { InputJSON } from '@template-goblin/types'
import { deserializeTemplate } from './batch.js'
import { generatePDF } from './generate.js'
import { prepareTemplate, type PreparedTemplate } from './prepare.js'
import { generatePreparedPDF } from './generatePrepared.js'

type SerializedTemplate = Parameters<typeof deserializeTemplate>[0]
type MainToWorker =
  | { type: 'init'; template: SerializedTemplate }
  | { type: 'job'; index: number; data: InputJSON }
  | { type: 'shutdown' }

let template: ReturnType<typeof deserializeTemplate> | null = null
// Lazily-built static/dynamic split, shared across this worker's jobs.
// `undefined` = not yet attempted, `null` = attempted and unavailable
// (fall back to full renders). Built on the SECOND job so a worker that
// only ever sees one job never pays for the static-base render.
let prepared: PreparedTemplate | null | undefined = undefined
let jobsSeen = 0

/** Render one job, compounding the static/dynamic split when this worker
 *  handles enough jobs to amortize the one-time base render. */
async function renderJob(
  tpl: ReturnType<typeof deserializeTemplate>,
  data: InputJSON,
): Promise<Buffer> {
  jobsSeen++
  if (prepared) return generatePreparedPDF(prepared, data)
  if (jobsSeen >= 2 && prepared === undefined) {
    try {
      prepared = await prepareTemplate(tpl)
      return generatePreparedPDF(prepared, data)
    } catch {
      prepared = null // give up on the fast path; keep doing full renders
    }
  }
  return generatePDF(tpl, data)
}

process.on('message', async (msg: MainToWorker) => {
  if (msg.type === 'init') {
    try {
      template = deserializeTemplate(msg.template)
      process.send?.({ type: 'ready' })
    } catch (err) {
      // A broken template can't produce any PDF — exit so the pool fails
      // the queued jobs and settles rather than waiting forever.
      process.send?.({
        type: 'result',
        success: false,
        error: err instanceof Error ? err.message : 'Template deserialize failed',
      })
      process.exit(1)
    }
    return
  }

  if (msg.type === 'shutdown') {
    process.exit(0)
  }

  // job
  try {
    if (!template) throw new Error('Worker received a job before init')
    const pdf = await renderJob(template, msg.data)
    process.send?.({ type: 'result', success: true, pdf: pdf.toString('base64') })
  } catch (err) {
    // Per-job failure — report and keep the worker alive for the next job.
    process.send?.({
      type: 'result',
      success: false,
      error: err instanceof Error ? err.message : 'Worker error',
    })
  }
})
