/**
 * `friendlyError` — every coded core error maps to a plain-language
 * explanation a non-technical user can act on; everything else collapses
 * to the generic internal-error line (with the raw error in the console).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { TemplateGoblinError } from '@template-goblin/types'
import { describeError, surfaceError } from '../friendlyError'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('describeError', () => {
  it('maps MISSING_ASSET to an actionable re-upload message with the field id', () => {
    const err = new TemplateGoblinError(
      'MISSING_ASSET',
      "Static image asset not found in .tgbl: field 'field-123' on page 0 references 'x.png', but the archive does not contain that file.",
      { fieldId: 'field-123', assetFilename: 'x.png' },
    )
    const msg = describeError(err)
    expect(msg).toContain('image is missing')
    expect(msg).toContain('field-123')
    expect(msg).toContain('upload')
    // The raw archive-speak must NOT leak through.
    expect(msg).not.toContain('.tgbl')
    expect(msg).not.toContain('archive')
  })

  it('maps MISSING_REQUIRED_FIELD with the json key', () => {
    const err = new TemplateGoblinError('MISSING_REQUIRED_FIELD', 'raw', { jsonKey: 'name' })
    const msg = describeError(err)
    expect(msg).toContain('"name"')
    expect(msg).toContain('Required')
  })

  it('duck-types coded errors across bundle boundaries (no instanceof)', () => {
    const fake = { name: 'TemplateGoblinError', code: 'INVALID_FORMAT', message: 'x', details: {} }
    expect(describeError(fake)).toContain('PNG or JPEG')
  })

  it('every ErrorCode has a non-generic mapping', () => {
    const codes = [
      'FILE_NOT_FOUND',
      'INVALID_FORMAT',
      'MISSING_MANIFEST',
      'INVALID_MANIFEST',
      'MISSING_ASSET',
      'MISSING_REQUIRED_FIELD',
      'INVALID_DATA_TYPE',
      'MAX_PAGES_EXCEEDED',
      'FONT_LOAD_FAILED',
      'PDF_GENERATION_FAILED',
      'SAVE_FAILED',
      'INVALID_SOURCE_MODE',
      'INVALID_STATIC_VALUE',
      'MISSING_STATIC_IMAGE_FILE',
      'MISSING_PLACEHOLDER_IMAGE_FILE',
      'INVALID_DYNAMIC_SOURCE',
      'DUPLICATE_JSON_KEY',
      'INVALID_TABLE_ROW',
      'FIELD_OVERLAPS_BAND',
      'PAGE_NUMBER_PLACEMENT_INVALID',
    ] as const
    const generic = describeError(new Error('plain'))
    for (const code of codes) {
      const msg = describeError(new TemplateGoblinError(code, 'raw message'))
      expect(msg, code).not.toBe(generic)
      expect(msg, code).not.toBe('raw message')
    }
  })

  it('plain errors collapse to the generic internal-error line', () => {
    const msg = describeError(new TypeError("Cannot read properties of undefined (reading 'x')"))
    expect(msg).toContain('Something unexpected went wrong')
    expect(msg).not.toContain('undefined')
  })
})

describe('surfaceError', () => {
  it('always logs the raw error to the console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    surfaceError('unit test', err)
    expect(spy).toHaveBeenCalledWith('[template-goblin] unit test failed:', err)
  })

  it('preferRaw keeps our own hand-written messages for uncoded errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const msg = surfaceError('open template', new Error('File too large (max 50 MB).'), true)
    expect(msg).toBe('File too large (max 50 MB).')
  })

  it('preferRaw still maps coded errors to the friendly text', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new TemplateGoblinError('INVALID_MANIFEST', 'zod stack trace soup')
    const msg = surfaceError('open template', err, true)
    expect(msg).toContain("doesn't look like a valid template")
  })
})
