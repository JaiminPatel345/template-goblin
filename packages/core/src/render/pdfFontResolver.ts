/**
 * Resolve a PDFKit font name from a (family, weight, style) triple.
 *
 * PDFKit ships the 14 PDF Standard fonts, each with up to four faces:
 *
 *   Helvetica   / Helvetica-Bold   / Helvetica-Oblique / Helvetica-BoldOblique
 *   Times-Roman / Times-Bold       / Times-Italic      / Times-BoldItalic
 *   Courier     / Courier-Bold     / Courier-Oblique   / Courier-BoldOblique
 *
 * The UI exposes `fontWeight: 'normal' | 'bold'` and
 * `fontStyle: 'normal' | 'italic'` flags on every text-bearing style
 * (text fields, table cells, table headers). Before this helper the
 * renderers ignored the flags entirely — bold/italic toggled in the
 * editor never made it into the PDF.
 *
 * For user-uploaded custom fonts (`fontId` set, registered via
 * `doc.registerFont`) we cannot synthesise bold/italic from a single
 * font file. The caller is expected to upload separate weight / style
 * variants as their own fonts. We return the registered name unchanged
 * — the flags are intentionally ignored in that branch.
 */

export type FontWeight = 'normal' | 'bold'
export type FontStyle = 'normal' | 'italic'

interface StandardFamily {
  base: string
  bold: string
  italic: string
  boldItalic: string
}

const STANDARD_FAMILIES: Record<string, StandardFamily> = {
  Helvetica: {
    base: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
    boldItalic: 'Helvetica-BoldOblique',
  },
  'Times-Roman': {
    base: 'Times-Roman',
    bold: 'Times-Bold',
    italic: 'Times-Italic',
    boldItalic: 'Times-BoldItalic',
  },
  Courier: {
    base: 'Courier',
    bold: 'Courier-Bold',
    italic: 'Courier-Oblique',
    boldItalic: 'Courier-BoldOblique',
  },
}

/**
 * Resolve the PDFKit font name to pass to `doc.font(name)`.
 *
 * @param fontFamily   - One of the 14 PDF Standard families, or the
 *                       value the UI persisted (e.g. 'Helvetica').
 * @param fontWeight   - 'normal' | 'bold'. Defaults to 'normal'.
 * @param fontStyle    - 'normal' | 'italic'. Defaults to 'normal'.
 * @param customFontName - Registered name from `registerFont` (set
 *                       when the user attached a custom font). When
 *                       present this wins — the standard-family
 *                       suffix lookup is skipped because a custom
 *                       face can't be synthesised on the fly.
 */
export function resolvePdfFontName(
  fontFamily: string | undefined,
  fontWeight: FontWeight | undefined,
  fontStyle: FontStyle | undefined,
  customFontName?: string | null,
): string {
  if (customFontName && customFontName.length > 0) {
    return customFontName
  }
  const family = fontFamily && fontFamily.length > 0 ? fontFamily : 'Helvetica'
  const std = STANDARD_FAMILIES[family]
  if (!std) {
    // Unknown family — return as-is so the caller surfaces a missing-
    // font error from PDFKit if the user typo'd.
    return family
  }
  const bold = fontWeight === 'bold'
  const italic = fontStyle === 'italic'
  if (bold && italic) return std.boldItalic
  if (bold) return std.bold
  if (italic) return std.italic
  return std.base
}
