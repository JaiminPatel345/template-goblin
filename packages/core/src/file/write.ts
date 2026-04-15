import { writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'
import AdmZip from 'adm-zip'
import type { TemplateManifest, TemplateAssets } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import {
  MANIFEST_FILENAME,
  BACKGROUND_FILENAME,
  BACKGROUNDS_DIR,
  FONTS_DIR,
  PLACEHOLDERS_DIR,
} from './constants.js'
import { subsetTemplateFonts } from '../utils/fontSubset.js'

/**
 * Save a template as a .tgbl ZIP file.
 *
 * Creates a ZIP archive containing manifest.json, background image,
 * fonts, and placeholder images as real binary files (not base64).
 *
 * @param manifest - Template manifest to save
 * @param assets - Template assets (background, fonts, placeholders)
 * @param outputPath - Path to write the .tgbl file
 * @param options - Optional settings (e.g., font subsetting)
 * @throws TemplateGoblinError on write failure
 */
export async function saveTemplate(
  manifest: TemplateManifest,
  assets: TemplateAssets,
  outputPath: string,
  options?: { subsetFonts?: boolean },
): Promise<void> {
  try {
    const zip = new AdmZip()

    // Font subsetting: reduce font file size by keeping only used glyphs
    const fonts = options?.subsetFonts ? subsetTemplateFonts(manifest, assets.fonts) : assets.fonts

    // REQ: manifest.json stored as JSON text
    const manifestJson = JSON.stringify(manifest, null, 2)
    zip.addFile(MANIFEST_FILENAME, Buffer.from(manifestJson, 'utf-8'))

    // REQ: background image stored as real binary (backward compat — page 0)
    if (assets.backgroundImage) {
      zip.addFile(BACKGROUND_FILENAME, assets.backgroundImage)
    }

    // REQ: per-page background images stored under backgrounds/
    if (assets.pageBackgrounds) {
      const sortedPages = manifest.pages
        ? [...manifest.pages].sort((a, b) => a.index - b.index)
        : []
      for (const page of sortedPages) {
        const bgBuffer = assets.pageBackgrounds.get(page.id)
        if (bgBuffer) {
          const filename = `${BACKGROUNDS_DIR}page-${page.index}.png`
          zip.addFile(filename, bgBuffer)
        }
      }
    }

    // REQ: fonts stored as real .ttf binaries under fonts/
    for (const [fontId, fontBuffer] of fonts) {
      const fontEntry = manifest.fonts.find((f) => f.id === fontId)
      const filename = fontEntry ? fontEntry.filename : `${FONTS_DIR}${fontId}.ttf`
      zip.addFile(filename, fontBuffer)
    }

    // REQ: placeholder images stored as real binaries under placeholders/
    for (const [name, imageBuffer] of assets.placeholders) {
      const filename = name.startsWith(PLACEHOLDERS_DIR) ? name : `${PLACEHOLDERS_DIR}${name}`
      zip.addFile(filename, imageBuffer)
    }

    // Ensure output directory exists
    const dir = dirname(outputPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    writeFileSync(outputPath, zip.toBuffer())
  } catch (error) {
    if (error instanceof TemplateGoblinError) throw error
    throw new TemplateGoblinError(
      'SAVE_FAILED',
      `Failed to save template: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  }
}
