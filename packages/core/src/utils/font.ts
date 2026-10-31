import type PDFDocument from 'pdfkit'
import type { LoadedTemplate } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { getDefaultUnicodeFont } from '../fonts/defaultUnicodeFont.js'

/** Name registered in PDFKit for the built-in universal Unicode font */
export const DEFAULT_UNICODE_FONT_NAME = 'TG-Default-Unicode'

/**
 * Register all custom fonts from a LoadedTemplate with a PDFKit document,
 * plus the built-in universal Unicode font for broad character support (e.g. ₹).
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

  // Register built-in Unicode font once
  try {
    doc.registerFont(DEFAULT_UNICODE_FONT_NAME, getDefaultUnicodeFont())
  } catch {
    // Already registered or defensive no-op
  }

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

/**
 * Check if the active font on doc can render all characters in text.
 * TrueType fonts are checked via `hasGlyphForCodePoint`; AFM / Standard 14
 * fonts are checked for code points outside WinAnsi (> 255).
 */
export function canFontRenderText(
  doc: InstanceType<typeof PDFDocument>,
  fontName: string,
  text: string,
): boolean {
  if (!text) return true
  try {
    doc.font(fontName)
    const active = doc as unknown as {
      _font?: {
        font?: {
          hasGlyphForCodePoint?: (cp: number) => boolean
        }
      }
    }
    const hasGlyph = active._font?.font?.hasGlyphForCodePoint
    if (typeof hasGlyph === 'function') {
      for (let i = 0; i < text.length; i++) {
        const cp = text.codePointAt(i)
        if (cp !== undefined && !hasGlyph(cp)) {
          return false
        }
      }
      return true
    }

    // Standard Type 1 font (WinAnsiEncoding): characters > 255 cannot be encoded
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 255) return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * Get a safe font name that is guaranteed to support all characters in `text`.
 * If `requestedFontName` lacks any glyphs (e.g. ₹ Indian Rupee in Helvetica),
 * falls back to `DEFAULT_UNICODE_FONT_NAME`.
 */
export function getSafeFontForText(
  doc: InstanceType<typeof PDFDocument>,
  requestedFontName: string,
  text: string,
): string {
  if (canFontRenderText(doc, requestedFontName, text)) {
    return requestedFontName
  }
  return DEFAULT_UNICODE_FONT_NAME
}
