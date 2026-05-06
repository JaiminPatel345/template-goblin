import type { InputJSON } from '@template-goblin/types'
import { generatePDF } from './generate.js'

/**
 * Convenience: load a template from disk and generate a PDF in one call.
 *
 * Lives in its own module so `generate.ts` (used by the browser entry, see
 * #86) does not statically reference `./load.js` — even via dynamic
 * import, Vite's pre-bundler scans those targets at scan time and fails
 * because `load.ts` reaches `node:fs`.
 *
 * Do NOT use this in a loop — call `loadTemplate()` once and reuse the
 * `LoadedTemplate` across many `generatePDF()` calls instead.
 *
 * @param path - Path to the .tgbl file
 * @param data - Input JSON with texts, images, and tables
 * @returns PDF as a Buffer
 */
export async function generatePDFFromFile(path: string, data: InputJSON): Promise<Buffer> {
  const { loadTemplate } = await import('./load.js')
  const template = await loadTemplate(path)
  return generatePDF(template, data)
}
