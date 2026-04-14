/**
 * template-goblin — PDF template engine
 *
 * Load a .tgbl template once, generate PDFs at scale with zero disk I/O.
 *
 * @packageDocumentation
 */

export { loadTemplate } from './load.js'
export { generatePDF, generatePDFFromFile } from './generate.js'
export { validateData } from './validate.js'
export { saveTemplate } from './file/write.js'
export { readManifest } from './file/read.js'
