/**
 * Runtime-data validation for dynamic `field.hyperlink` (#87).
 *
 * Static hyperlinks are validated at load time by `validateManifest`. At
 * `validateData` time we only police dynamic ones: pull
 * `data.links[jsonKey]` (separate top-level bucket from `texts` so URLs
 * are visually distinct), accept it if empty (no link, no error) or if
 * it passes the protocol allowlist; reject otherwise as
 * `INVALID_DATA_TYPE`.
 */
import type {
  FieldDefinition,
  InputJSON,
  LoadedTemplate,
  TemplateManifest,
} from '@template-goblin/types'
import { validateData } from '../src/validate.js'
import { dynText, makeManifest } from './helpers/fixtures.js'

function template(fields: FieldDefinition[]): LoadedTemplate {
  const manifest: TemplateManifest = makeManifest({ fields })
  return {
    manifest,
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: new Map(),
    placeholders: new Map(),
    staticImages: new Map(),
  }
}

describe('validateData — dynamic field.hyperlink', () => {
  const linkedField: FieldDefinition = {
    ...dynText('t1', 'name', false),
    hyperlink: { mode: 'dynamic', jsonKey: 'profile_url' },
  }

  it('accepts a valid https URL pulled from links[jsonKey]', () => {
    const t = template([linkedField])
    const data: InputJSON = {
      texts: { name: 'Alice' },
      images: {},
      tables: {},
      links: { profile_url: 'https://example.com/alice' },
    }
    expect(validateData(t, data)).toEqual({ valid: true, errors: [] })
  })

  it('accepts mailto, tel, http schemes', () => {
    const t = template([linkedField])
    for (const url of ['mailto:foo@example.com', 'tel:+15551234', 'http://localhost']) {
      const data: InputJSON = {
        texts: { name: 'X' },
        images: {},
        tables: {},
        links: { profile_url: url },
      }
      expect(validateData(t, data).valid).toBe(true)
    }
  })

  it('treats empty / missing links[jsonKey] as no-link (no error)', () => {
    const t = template([linkedField])
    const empty: InputJSON = {
      texts: { name: 'Alice' },
      images: {},
      tables: {},
      links: { profile_url: '' },
    }
    const missing: InputJSON = { texts: { name: 'Alice' }, images: {}, tables: {} }
    expect(validateData(t, empty)).toEqual({ valid: true, errors: [] })
    expect(validateData(t, missing)).toEqual({ valid: true, errors: [] })
  })

  it('rejects a non-empty value that is not a valid URL', () => {
    const t = template([linkedField])
    const data: InputJSON = {
      texts: { name: 'Alice' },
      images: {},
      tables: {},
      links: { profile_url: 'just a string' },
    }
    const result = validateData(t, data)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_DATA_TYPE', field: 'profile_url' }),
      ]),
    )
  })

  it.each([
    ['ftp', 'ftp://example.com'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/plain,hello'],
  ])('rejects %s scheme as INVALID_DATA_TYPE', (_label, url) => {
    const t = template([linkedField])
    const data: InputJSON = {
      texts: { name: 'A' },
      images: {},
      tables: {},
      links: { profile_url: url },
    }
    const result = validateData(t, data)
    expect(result.valid).toBe(false)
  })

  it('does not validate static hyperlinks here (those are manifest-time)', () => {
    // A static link with a totally invalid URL would be rejected at
    // manifest-load time. validateData should NOT re-flag it.
    const t = template([
      {
        ...dynText('t1', 'name', false),
        // bypass type narrowing — we want to prove validateData ignores
        // this branch even if it happened to slip through.
        hyperlink: { mode: 'static', url: 'ftp://nope' } as { mode: 'static'; url: string },
      },
    ])
    const data: InputJSON = { texts: { name: 'A' }, images: {}, tables: {} }
    expect(validateData(t, data)).toEqual({ valid: true, errors: [] })
  })

  it('a value in texts (not links) does NOT satisfy a dynamic hyperlink', () => {
    const t = template([linkedField])
    // Putting the URL in `texts` instead of `links` should be treated as
    // "no link" (the renderer reads from `links`). No error either —
    // empty/missing is the no-link contract.
    const data: InputJSON = {
      texts: { name: 'Alice', profile_url: 'https://example.com' },
      images: {},
      tables: {},
    }
    expect(validateData(t, data)).toEqual({ valid: true, errors: [] })
  })

  it.each([
    ['number', 42],
    ['boolean', true],
    ['null', null],
    ['object', { url: 'https://example.com' }],
    ['array', ['https://example.com']],
  ])('rejects a non-string %s in links[jsonKey]', (_label, val) => {
    const t = template([linkedField])
    const data = {
      texts: { name: 'Alice' },
      images: {},
      tables: {},
      links: { profile_url: val },
    } as unknown as InputJSON
    if (val === null) {
      // null is treated as "missing" by the empty-check, so no error.
      expect(validateData(t, data)).toEqual({ valid: true, errors: [] })
    } else {
      expect(validateData(t, data).valid).toBe(false)
    }
  })

  it('multiple fields with hyperlinks: each is validated independently', () => {
    const t = template([
      { ...dynText('t1', 'a', false), hyperlink: { mode: 'dynamic', jsonKey: 'link_a' } },
      { ...dynText('t2', 'b', false), hyperlink: { mode: 'dynamic', jsonKey: 'link_b' } },
      { ...dynText('t3', 'c', false), hyperlink: { mode: 'dynamic', jsonKey: 'link_c' } },
    ])
    const data: InputJSON = {
      texts: { a: 'A', b: 'B', c: 'C' },
      images: {},
      tables: {},
      links: {
        link_a: 'https://valid.example.com',
        link_b: 'ftp://nope', // bad scheme
        link_c: '', // empty → no error
      },
    }
    const result = validateData(t, data)
    expect(result.valid).toBe(false)
    // Only link_b should produce an error; link_a is valid, link_c is
    // empty (treated as "no link, no error").
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({
      code: 'INVALID_DATA_TYPE',
      field: 'link_b',
    })
  })

  it('two fields share a hyperlink jsonKey — single value validated once', () => {
    const t = template([
      { ...dynText('t1', 'a', false), hyperlink: { mode: 'dynamic', jsonKey: 'shared' } },
      { ...dynText('t2', 'b', false), hyperlink: { mode: 'dynamic', jsonKey: 'shared' } },
    ])
    const data: InputJSON = {
      texts: { a: 'A', b: 'B' },
      images: {},
      tables: {},
      links: { shared: 'ftp://nope' },
    }
    const result = validateData(t, data)
    expect(result.valid).toBe(false)
    // Both fields point to the same key; we get one error per FIELD —
    // the contract is field-level reporting, not key-level dedup. Still
    // useful diagnostic.
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors.every((e) => e.field === 'shared')).toBe(true)
  })

  it('whitespace-only link value is rejected (not "empty")', () => {
    // A trimmed-to-zero string is empty; a string of whitespace is NOT.
    // It also isn't a valid URL — should fail validation.
    const t = template([linkedField])
    const data: InputJSON = {
      texts: { name: 'A' },
      images: {},
      tables: {},
      links: { profile_url: '   ' },
    }
    expect(validateData(t, data).valid).toBe(false)
  })

  it('field with no hyperlink at all is unaffected by validation', () => {
    const t = template([dynText('t1', 'name', false)])
    const data: InputJSON = {
      texts: { name: 'Alice' },
      images: {},
      tables: {},
      links: { random_key: 'ftp://nope' },
    }
    // Spurious entries in `links` are tolerated — there's no field
    // pointing at `random_key`, so it's just unused noise.
    expect(validateData(t, data)).toEqual({ valid: true, errors: [] })
  })
})
