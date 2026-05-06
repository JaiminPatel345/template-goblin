/**
 * runCorePreview — calls `template-goblin`'s real `generatePDF` against the
 * current store snapshot + the user's preview JSON, returns the resulting
 * PDF bytes (#86). The dialog wraps this in a `Blob` and opens it in a new
 * tab — the preview is byte-identical to what an SDK consumer gets when
 * they call `generatePDF(template, data)`.
 *
 * This module deliberately holds the only `import { generatePDF }` in the
 * UI: lazy-loading would lose the type contract; we accept the cold-load
 * cost (PDFKit + fontkit) for now and add code-splitting in a follow-up.
 */
import { generatePDF, type GeneratePDFOptions } from 'template-goblin/browser'
import type { InputJSON } from '@template-goblin/types'
import { templateToLoaded, type TemplateStoreSnapshot } from './templateToLoaded.js'

/**
 * Generate the preview PDF and return the bytes as a `Uint8Array`.
 *
 * The browser-side `Buffer` polyfill produces values that satisfy
 * `Uint8Array`'s contract, which is what `Blob` and `URL.createObjectURL`
 * expect — so converting up front keeps the call site cheap.
 */
export async function runCorePreview(
  state: TemplateStoreSnapshot,
  data: InputJSON,
  options?: GeneratePDFOptions,
): Promise<Uint8Array> {
  const template = templateToLoaded(state)
  const buf = await generatePDF(template, data, options)
  // `Buffer` extends `Uint8Array`; Blob accepts either, but TS prefers a
  // strict `ArrayBuffer`-backed view. Copy into a fresh array so the
  // resulting view's `.buffer` is unambiguously an `ArrayBuffer`.
  const out = new Uint8Array(buf.byteLength)
  out.set(buf)
  return out
}

/**
 * Convenience: wrap the bytes as a PDF Blob URL and open the result in a
 * new browser tab. The Object URL is kept alive — the new tab needs it
 * accessible until it finishes loading, and we'd race a `revokeObjectURL`
 * call against that. Browsers reclaim the URL when the tab unloads.
 */
export function openPdfInNewTab(bytes: Uint8Array): void {
  // `Blob` requires an `ArrayBuffer`-backed view (TS rejects `Uint8Array<
  // ArrayBufferLike>` outright). Copy into a fresh ArrayBuffer to satisfy
  // the contract while staying zero-cost in practice.
  const ab = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(ab).set(bytes)
  const blob = new Blob([ab], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
