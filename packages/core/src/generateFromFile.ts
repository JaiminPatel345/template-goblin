import type { InputJSON } from '@template-goblin/types'
import { generatePDF, type GeneratePDFOptions } from './generate.js'

/**
 * Convenience: load a template from disk and generate a PDF in one call.
 *
 * Lives in its own module so `generate.ts` (used by the browser entry, see
 * #86) does not statically reference `./load.js`.
 *
 * @param path - Path to the .tgbl file
 * @param data - Input JSON with texts, images, and tables
 * @param options - Optional generation settings (e.g. maxRenderPages)
 * @returns PDF as a Buffer
 */
export async function generatePDFFromFile(
  path: string,
  data: InputJSON,
  options?: GeneratePDFOptions,
): Promise<Buffer> {
  const { loadTemplate } = await import('./load.js')
  const template = await loadTemplate(path)
  return generatePDF(template, data, options)
}
