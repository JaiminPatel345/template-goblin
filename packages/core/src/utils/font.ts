import type PDFDocument from 'pdfkit'
import type { LoadedTemplate } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'

/**
 * Register all custom fonts from a LoadedTemplate with a PDFKit document.
 *
 * Each font is registered once using its fontId as the name.
 * After registration, fields can reference fonts by fontId.
 *
 * @param doc - PDFKit document
 * @param template - LoadedTemplate with font buffers
 * @returns Map of fontId → registered font name (for use in renderText)
 */
export function registerFonts(
  doc: InstanceType<typeof PDFDocument>,
  template: LoadedTemplate,
): Map<string, string> {
  const fontMap = new Map<string, string>()

  for (const fontDef of template.manifest.fonts) {
    const fontBuffer = template.fonts.get(fontDef.id)
    if (!fontBuffer) {
      throw new TemplateGoblinError(
        'FONT_LOAD_FAILED',
        `Failed to load font: ${fontDef.filename} (id: ${fontDef.id})`,
      )
    }

    try {
      doc.registerFont(fontDef.id, fontBuffer)
      fontMap.set(fontDef.id, fontDef.id)
    } catch (error) {
      throw new TemplateGoblinError(
        'FONT_LOAD_FAILED',
        `Failed to load font: ${fontDef.filename} — ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    }
  }

  return fontMap
}
