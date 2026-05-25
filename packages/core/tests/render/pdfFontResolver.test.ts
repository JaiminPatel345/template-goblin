/**
 * Tests for the (family, weight, style) → PDFKit font name resolver.
 *
 * Pre-fix the renderers ignored fontWeight + fontStyle, so the editor's
 * Bold / Italic toggles never reached the PDF. These tests pin the
 * mapping across the three standard families that ship with PDFKit
 * plus the custom-font escape hatch.
 */
import { resolvePdfFontName } from '../../src/render/pdfFontResolver.js'

describe('resolvePdfFontName', () => {
  describe('Helvetica family', () => {
    it('returns the base name for normal / normal', () => {
      expect(resolvePdfFontName('Helvetica', 'normal', 'normal')).toBe('Helvetica')
    })
    it('returns Helvetica-Bold for bold', () => {
      expect(resolvePdfFontName('Helvetica', 'bold', 'normal')).toBe('Helvetica-Bold')
    })
    it('returns Helvetica-Oblique for italic', () => {
      expect(resolvePdfFontName('Helvetica', 'normal', 'italic')).toBe('Helvetica-Oblique')
    })
    it('returns Helvetica-BoldOblique for bold + italic', () => {
      expect(resolvePdfFontName('Helvetica', 'bold', 'italic')).toBe('Helvetica-BoldOblique')
    })
  })

  describe('Times-Roman family', () => {
    it('returns the base name for normal / normal', () => {
      expect(resolvePdfFontName('Times-Roman', 'normal', 'normal')).toBe('Times-Roman')
    })
    it('returns Times-Bold for bold', () => {
      expect(resolvePdfFontName('Times-Roman', 'bold', 'normal')).toBe('Times-Bold')
    })
    it('returns Times-Italic for italic (NOT -Oblique)', () => {
      expect(resolvePdfFontName('Times-Roman', 'normal', 'italic')).toBe('Times-Italic')
    })
    it('returns Times-BoldItalic for bold + italic', () => {
      expect(resolvePdfFontName('Times-Roman', 'bold', 'italic')).toBe('Times-BoldItalic')
    })
  })

  describe('Courier family', () => {
    it('returns the base name for normal / normal', () => {
      expect(resolvePdfFontName('Courier', 'normal', 'normal')).toBe('Courier')
    })
    it('returns Courier-Bold for bold', () => {
      expect(resolvePdfFontName('Courier', 'bold', 'normal')).toBe('Courier-Bold')
    })
    it('returns Courier-Oblique for italic', () => {
      expect(resolvePdfFontName('Courier', 'normal', 'italic')).toBe('Courier-Oblique')
    })
    it('returns Courier-BoldOblique for bold + italic', () => {
      expect(resolvePdfFontName('Courier', 'bold', 'italic')).toBe('Courier-BoldOblique')
    })
  })

  describe('custom embedded fonts', () => {
    it('uses the registered name when provided, ignoring bold + italic', () => {
      // A user-uploaded font is registered with its own name; bold and
      // italic must come from separate uploaded files, not from a
      // suffix lookup. The resolver returns the custom name as-is.
      expect(resolvePdfFontName('Helvetica', 'bold', 'italic', 'MyCustomFont')).toBe('MyCustomFont')
    })
    it('falls back to the standard lookup when custom name is empty', () => {
      expect(resolvePdfFontName('Helvetica', 'bold', undefined, '')).toBe('Helvetica-Bold')
    })
    it('falls back to the standard lookup when custom name is null', () => {
      expect(resolvePdfFontName('Times-Roman', undefined, 'italic', null)).toBe('Times-Italic')
    })
  })

  describe('defaults', () => {
    it('defaults to Helvetica when family is missing', () => {
      expect(resolvePdfFontName(undefined, 'bold', 'normal')).toBe('Helvetica-Bold')
    })
    it('returns unknown family names unchanged (so PDFKit surfaces missing-font errors)', () => {
      expect(resolvePdfFontName('NotAFont', 'bold', 'italic')).toBe('NotAFont')
    })
  })
})
