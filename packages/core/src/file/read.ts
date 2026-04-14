import type { TemplateManifest } from '@template-goblin/types'

/**
 * Read ONLY the manifest.json from a .tgbl file without loading assets.
 *
 * Fast operation for validation, listing, or metadata inspection.
 *
 * @param path - Path to the .tgbl file
 * @returns Parsed TemplateManifest
 * @throws TemplateGoblinError with code FILE_NOT_FOUND, INVALID_FORMAT, MISSING_MANIFEST, or INVALID_MANIFEST
 */
export async function readManifest(_path: string): Promise<TemplateManifest> {
  // TODO: Implement in spec 001/007
  throw new Error('Not implemented')
}
