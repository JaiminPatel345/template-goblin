import { describe, it, expect } from 'vitest'
import type { FieldSource, ImageSourceValue } from '@template-goblin/types'
import {
  parseInputJson,
  validateUpload,
  getPlaceholderFilename,
  buildPreviewInputData,
  MAX_UPLOAD_BYTES,
} from '../previewDialogHelpers.js'

describe('parseInputJson', () => {
  it('accepts a well-formed object with all three buckets', () => {
    const r = parseInputJson('{"texts":{"name":"x"},"tables":{},"images":{}}')
    expect(r.ok).toBe(true)
  })

  it('accepts an empty object — buckets are optional', () => {
    const r = parseInputJson('{}')
    expect(r.ok).toBe(true)
  })

  it('rejects malformed JSON with a parse error message', () => {
    const r = parseInputJson('{not json')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/JSON|token|Unexpected/i)
  })

  it('rejects a top-level array', () => {
    const r = parseInputJson('[]')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/object/i)
  })

  it('rejects a top-level primitive', () => {
    const r = parseInputJson('"hello"')
    expect(r.ok).toBe(false)
  })

  it('rejects null', () => {
    const r = parseInputJson('null')
    expect(r.ok).toBe(false)
  })

  it('rejects "texts" as an array', () => {
    const r = parseInputJson('{"texts":["a","b"]}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/texts/)
  })

  it('rejects "tables" as a string', () => {
    const r = parseInputJson('{"tables":"oops"}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/tables/)
  })

  it('rejects "images" as null', () => {
    const r = parseInputJson('{"images":null}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/images/)
  })

  it('ignores unknown top-level keys', () => {
    const r = parseInputJson('{"texts":{},"extra":42}')
    expect(r.ok).toBe(true)
  })

  // ---- GH #87 hyperlink bucket ----

  it('accepts a "links" bucket', () => {
    const r = parseInputJson('{"texts":{},"links":{"profile_url":"https://x.com"}}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.links).toEqual({ profile_url: 'https://x.com' })
    }
  })

  it('accepts an empty "links" bucket', () => {
    const r = parseInputJson('{"links":{}}')
    expect(r.ok).toBe(true)
  })

  it('rejects "links" as an array', () => {
    const r = parseInputJson('{"links":["https://x.com"]}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/links/)
  })

  it('rejects "links" as a string', () => {
    const r = parseInputJson('{"links":"https://x.com"}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/links/)
  })

  // ---- Condition-based styling (#43) ----

  it('accepts a valid condition string', () => {
    const r = parseInputJson('{"condition":"condition-2"}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.condition).toBe('condition-2')
    }
  })

  it('rejects condition if not a string', () => {
    const r = parseInputJson('{"condition":123}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/condition.*string/i)
  })

  it('accepts conditions mapping object', () => {
    const r = parseInputJson('{"conditions":{"field-1":"urgent"}}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.conditions).toEqual({ 'field-1': 'urgent' })
    }
  })

  it('rejects conditions if not an object', () => {
    const r = parseInputJson('{"conditions":"urgent"}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/conditions.*object/i)
  })

  it('rejects "links" as null', () => {
    const r = parseInputJson('{"links":null}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/links/)
  })

  it('parses a complete payload with all four buckets', () => {
    const r = parseInputJson(
      '{"texts":{"a":"x"},"tables":{},"images":{},"links":{"l":"https://example.com"}}',
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data).toEqual({
        texts: { a: 'x' },
        tables: {},
        images: {},
        links: { l: 'https://example.com' },
      })
    }
  })
})

describe('validateUpload', () => {
  function fakeFile(type: string, size: number): File {
    // The size + type are what `validateUpload` checks; the byte content is
    // immaterial. Build a 1-byte File and override `size` so we can cheaply
    // simulate the 10 MB cap without allocating the bytes.
    const f = new File([new Uint8Array(1)], 'x', { type })
    Object.defineProperty(f, 'size', { value: size })
    return f
  }

  it('accepts PNG under the cap', () => {
    expect(validateUpload(fakeFile('image/png', 1024))).toBeNull()
  })

  it('accepts JPEG under the cap', () => {
    expect(validateUpload(fakeFile('image/jpeg', 1024))).toBeNull()
  })

  it('accepts WEBP under the cap', () => {
    // WEBP is NOT accepted — the PDF engine renders only PNG/JPEG, so
    // inviting it here just deferred the failure to Render.
    expect(validateUpload(fakeFile('image/webp', 1024))).not.toBeNull()
  })

  it('rejects GIF (not in the allow-list per the issue spec)', () => {
    const err = validateUpload(fakeFile('image/gif', 1024))
    expect(err).not.toBeNull()
    expect(err).toMatch(/PNG|JPEG|WEBP/i)
  })

  it('rejects PDF', () => {
    const err = validateUpload(fakeFile('application/pdf', 1024))
    expect(err).not.toBeNull()
  })

  it('rejects empty MIME type', () => {
    const err = validateUpload(fakeFile('', 1024))
    expect(err).not.toBeNull()
    expect(err).toMatch(/unknown/i)
  })

  it('rejects a file just over 10 MB', () => {
    const err = validateUpload(fakeFile('image/png', MAX_UPLOAD_BYTES + 1))
    expect(err).not.toBeNull()
    expect(err).toMatch(/MB/)
  })

  it('accepts a file at exactly 10 MB', () => {
    expect(validateUpload(fakeFile('image/png', MAX_UPLOAD_BYTES))).toBeNull()
  })
})

describe('getPlaceholderFilename', () => {
  function dynamicWith(placeholder: unknown): FieldSource<ImageSourceValue> {
    return {
      mode: 'dynamic',
      jsonKey: 'k',
      required: false,
      placeholder: placeholder as ImageSourceValue | null,
    }
  }

  it('returns the filename for a dynamic source with a placeholder', () => {
    expect(getPlaceholderFilename(dynamicWith({ filename: 'photo.png' }))).toBe('photo.png')
  })

  it('returns null when the placeholder is null', () => {
    expect(getPlaceholderFilename(dynamicWith(null))).toBeNull()
  })

  it('returns null when the placeholder has no filename', () => {
    expect(getPlaceholderFilename(dynamicWith({ filename: '' }))).toBeNull()
  })

  it('returns null for a static source (no placeholder concept)', () => {
    const staticSrc: FieldSource<ImageSourceValue> = {
      mode: 'static',
      value: { filename: 'pic.png' },
    }
    expect(getPlaceholderFilename(staticSrc)).toBeNull()
  })
})

describe('buildPreviewInputData', () => {
  it('passes condition and conditions through to the returned data', () => {
    const parsed = {
      texts: { title: 'Invoice' },
      condition: 'condition-2',
      conditions: { 'field-1': 'condition-1' },
    }
    const result = buildPreviewInputData(parsed, [], new Map(), new Map())
    expect(result.condition).toBe('condition-2')
    expect(result.conditions).toEqual({ 'field-1': 'condition-1' })
    expect(result.texts).toEqual({ title: 'Invoice' })
  })
})
