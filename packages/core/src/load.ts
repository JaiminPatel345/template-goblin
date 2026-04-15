import AdmZip from 'adm-zip'
import type { LoadedTemplate } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { readTgblBuffer, parseManifestFromZip } from './file/read.js'
import { BACKGROUND_FILENAME, BACKGROUNDS_DIR } from './file/constants.js'

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
export async function loadTemplate(path: string): Promise<LoadedTemplate> {
  // REQ: Read and verify ZIP file
  const buffer = readTgblBuffer(path)
  const zip = new AdmZip(buffer)

  // REQ: Parse and validate manifest
  const manifest = parseManifestFromZip(zip)

  // REQ: Load background image as Buffer (optional)
  let backgroundImage: Buffer | null = null
  const bgEntry = zip.getEntry(BACKGROUND_FILENAME)
  if (bgEntry) {
    backgroundImage = bgEntry.getData()
  }

  // REQ: Load all fonts referenced in manifest as Buffers
  const fonts = new Map<string, Buffer>()
  for (const fontDef of manifest.fonts) {
    const fontEntry = zip.getEntry(fontDef.filename)
    if (!fontEntry) {
      throw new TemplateGoblinError(
        'MISSING_ASSET',
        `Missing asset: ${fontDef.filename} referenced in manifest but not found in archive`,
      )
    }
    fonts.set(fontDef.id, fontEntry.getData())
  }

  // REQ: Load per-page background images
  const pageBackgrounds = new Map<string, Buffer>()

  if (manifest.pages && manifest.pages.length > 0) {
    // Load each page's background from its backgroundFilename
    for (const page of manifest.pages) {
      if (page.backgroundType === 'image' && page.backgroundFilename) {
        const entry = zip.getEntry(page.backgroundFilename)
        if (entry) {
          pageBackgrounds.set(page.id, entry.getData())
        }
      }
    }
  } else {
    // Backward compat: also check for backgrounds/ folder entries
    const entries = zip.getEntries()
    for (const entry of entries) {
      if (entry.entryName.startsWith(BACKGROUNDS_DIR) && !entry.isDirectory) {
        pageBackgrounds.set(entry.entryName, entry.getData())
      }
    }
  }

  // REQ: Load all placeholder images referenced by image fields
  const placeholders = new Map<string, Buffer>()
  for (const field of manifest.fields) {
    if (field.type === 'image') {
      const style = field.style as { placeholderFilename?: string | null }
      if (style.placeholderFilename) {
        if (!placeholders.has(style.placeholderFilename)) {
          const entry = zip.getEntry(style.placeholderFilename)
          if (!entry) {
            throw new TemplateGoblinError(
              'MISSING_ASSET',
              `Missing asset: ${style.placeholderFilename} referenced in manifest but not found in archive`,
            )
          }
          placeholders.set(style.placeholderFilename, entry.getData())
        }
      }
    }
  }

  return {
    manifest,
    backgroundImage,
    pageBackgrounds,
    fonts,
    placeholders,
  }
}
