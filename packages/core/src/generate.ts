import type { LoadedTemplate, InputJSON } from '@template-goblin/types'

/**
 * Generate a PDF from an in-memory template and input data.
 *
 * This is the hot path — called millions of times. Zero disk I/O.
 * All assets are already loaded in the LoadedTemplate object.
 *
 * @param template - LoadedTemplate returned by loadTemplate()
 * @param data - Input JSON with texts, loops, and images
 * @returns PDF as a Buffer
 * @throws TemplateGoblinError with code MISSING_REQUIRED_FIELD, INVALID_DATA_TYPE, MAX_PAGES_EXCEEDED, or PDF_GENERATION_FAILED
 */
export async function generatePDF(_template: LoadedTemplate, _data: InputJSON): Promise<Buffer> {
  // TODO: Implement in spec 008
  throw new Error('Not implemented')
}

/**
 * Convenience function: load a template from disk and generate a PDF in one call.
 *
 * Do NOT use this in a loop — use loadTemplate() + generatePDF() instead.
 *
 * @param path - Path to the .tgbl file
 * @param data - Input JSON with texts, loops, and images
 * @returns PDF as a Buffer
 */
export async function generatePDFFromFile(path: string, data: InputJSON): Promise<Buffer> {
  const { loadTemplate } = await import('./load.js')
  const template = await loadTemplate(path)
  return generatePDF(template, data)
}
