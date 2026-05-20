/**
 * Page-number helpers (#61).
 *
 * Pure — used by both the core renderer (PDFKit stamp pass) and the
 * canvas band visualisation so the rendered numeral always matches what
 * the user sees in the editor.
 */
import type { PageNumberNumeralStyle, PageNumberConfig } from './template.js'

/**
 * Reasonable defaults for a freshly-enabled page-number config. Callers
 * spread this on top of any partial config supplied by the UI.
 */
export function defaultPageNumberConfig(): PageNumberConfig {
  return {
    enabled: true,
    placement: 'footer',
    align: 'center',
    color: '#000000',
    numeralStyle: 'arabic',
    fontFamily: 'Helvetica',
    fontSize: 10,
    showOnFirstPage: false,
  }
}

/**
 * Convert a positive integer to its Roman-numeral representation. Defined
 * for 1..3999 (PDF templates are not going past that). Numbers outside the
 * range fall back to arabic so we never produce an empty string.
 */
export function toRoman(value: number): string {
  if (!Number.isFinite(value) || value < 1 || value > 3999 || !Number.isInteger(value)) {
    return String(value)
  }
  const pairs: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let n = value
  let out = ''
  for (const [v, sym] of pairs) {
    while (n >= v) {
      out += sym
      n -= v
    }
  }
  return out
}

/**
 * Format a page index (1-based) in the requested numeral style. Roman
 * numerals are conventionally lowercase for front-matter pages and
 * uppercase for chapter numbering; we go uppercase since template
 * page-numbering is almost always main-matter.
 */
export function formatPageNumber(pageIndex1Based: number, style: PageNumberNumeralStyle): string {
  if (style === 'roman') return toRoman(pageIndex1Based)
  return String(pageIndex1Based)
}
