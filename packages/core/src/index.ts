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
export { generateBatchPDF } from './batch.js'
export type { BatchOptions, BatchResult } from './batch.js'
export { generateAndStore, S3StorageProvider } from './storage.js'
export type { StorageProvider, GenerateAndStoreOptions, StoreResult } from './storage.js'
export { subsetTemplateFonts, extractUsedCodePoints } from './utils/fontSubset.js'
