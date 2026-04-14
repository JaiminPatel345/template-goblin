import type { TemplateManifest, TemplateAssets } from '@template-goblin/types'

/**
 * Save a template as a .tgbl ZIP file.
 *
 * Creates a ZIP archive containing manifest.json, background image,
 * fonts, and placeholder images.
 *
 * @param manifest - Template manifest to save
 * @param assets - Template assets (background, fonts, placeholders)
 * @param outputPath - Path to write the .tgbl file
 * @throws TemplateGoblinError on write failure
 */
export async function saveTemplate(
  _manifest: TemplateManifest,
  _assets: TemplateAssets,
  _outputPath: string,
): Promise<void> {
  // TODO: Implement in spec 001
  throw new Error('Not implemented')
}
