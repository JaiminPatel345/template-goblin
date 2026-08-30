/**
 * template-goblin — PDF template engine
 *
 * Load a .tgbl template once, generate PDFs at scale with zero disk I/O.
 *
 * @packageDocumentation
 */

export { loadTemplate } from './load.js'
export { generatePDF } from './generate.js'
export type { GeneratePDFOptions } from './generate.js'
export { generatePDFFromFile } from './generateFromFile.js'
export { validateData } from './validate.js'
export { validateManifest } from './validateManifest.js'
export { prepareTemplate } from './prepare.js'
export type { PreparedTemplate } from './prepare.js'
export { generatePreparedPDF } from './generatePrepared.js'
export { collectReferencedImageAssets } from './assetRefs.js'
export type { ReferencedImageAssets } from './assetRefs.js'
export { resolveValue } from './utils/resolveValue.js'
export { saveTemplate } from './file/write.js'
export { readManifest } from './file/read.js'
export { generateBatchPDF } from './batch.js'
export type { BatchOptions, BatchResult } from './batch.js'
export { generateAndStore, S3StorageProvider } from './storage.js'
export type { StorageProvider, GenerateAndStoreOptions, StoreResult } from './storage.js'
export { subsetTemplateFonts, extractUsedCodePoints } from './utils/fontSubset.js'
export {
  parseImageColorMarker,
  isImageColorMarker,
  makeImageColorMarker,
} from './utils/imageColorMarker.js'
