/**
 * Browser-friendly entry for `template-goblin`. Re-exports the surface a
 * web client needs to render a preview PDF without pulling in Node-only
 * file-system helpers (#86).
 *
 * Excluded vs. the main entry:
 *   - `loadTemplate` / `readManifest` / `saveTemplate` — fs-backed I/O.
 *   - `generateAndStore` / `S3StorageProvider` — disk + cloud storage.
 *   - `generateBatchPDF` — Worker pool + filesystem batching.
 *
 * Included:
 *   - `generatePDF` — the only fs-free render entry. `generatePDFFromFile`
 *     is excluded because it dyn-imports `loadTemplate` which transitively
 *     pulls `./file/read.js` (uses `node:fs`); even unused, Vite's
 *     pre-bundler scans dynamic imports and fails on the fs reference.
 *   - `validateData`, `validateManifest`, `resolveValue` — pure logic.
 *   - `subsetTemplateFonts`, `extractUsedCodePoints` — pure logic.
 *
 * UI clients (`packages/ui`) import from `template-goblin/browser` so
 * Vite's pre-bundler doesn't try to resolve `node:fs` writes that the
 * browser can't service.
 */
export { generatePDF } from './generate.js'
export type { GeneratePDFOptions } from './generate.js'
export { validateData } from './validate.js'
export { validateManifest } from './validateManifest.js'
export { prepareTemplate } from './prepare.js'
export type { PreparedTemplate } from './prepare.js'
export { generatePreparedPDF } from './generatePrepared.js'
export { collectReferencedImageAssets } from './assetRefs.js'
export type { ReferencedImageAssets } from './assetRefs.js'
export { resolveValue } from './utils/resolveValue.js'
export { subsetTemplateFonts, extractUsedCodePoints } from './utils/fontSubset.js'
export {
  parseImageColorMarker,
  isImageColorMarker,
  makeImageColorMarker,
} from './utils/imageColorMarker.js'
