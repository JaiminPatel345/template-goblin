import type { LoadedTemplate } from '@template-goblin/types'

/**
 * Load a .tgbl template from disk into memory.
 *
 * Extracts the ZIP archive, parses the manifest, and loads all assets
 * (background image, fonts, placeholder images) as Buffers.
 *
 * Call this ONCE at server startup or lazily on first request.
 * The returned LoadedTemplate is reused across all generatePDF() calls.
 *
 * @param path - Absolute or relative path to the .tgbl file
 * @returns LoadedTemplate with all assets in memory
 * @throws TemplateGoblinError with code FILE_NOT_FOUND, INVALID_FORMAT, MISSING_MANIFEST, INVALID_MANIFEST, or MISSING_ASSET
 */
export async function loadTemplate(_path: string): Promise<LoadedTemplate> {
  // TODO: Implement in spec 007
  throw new Error('Not implemented')
}
