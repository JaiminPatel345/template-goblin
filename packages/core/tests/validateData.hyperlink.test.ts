/**
 * Runtime-data validation for dynamic `field.hyperlink` (#87).
 *
 * Static hyperlinks are validated at load time by `validateManifest`. At
 * `validateData` time we only police dynamic ones: pull
 * `data.texts[jsonKey]`, accept it if empty (no link, no error) or if it
 * passes the protocol allowlist; reject otherwise as `INVALID_DATA_TYPE`.
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

  it('accepts a valid https URL pulled from texts[jsonKey]', () => {
    const t = template([linkedField])
    const data: InputJSON = {
      texts: { name: 'Alice', profile_url: 'https://example.com/alice' },
      images: {},
      tables: {},
    }
    expect(validateData(t, data)).toEqual({ valid: true, errors: [] })
  })

  it('accepts mailto, tel, http schemes', () => {
    const t = template([linkedField])
    for (const url of ['mailto:foo@example.com', 'tel:+15551234', 'http://localhost']) {
      const data: InputJSON = { texts: { name: 'X', profile_url: url }, images: {}, tables: {} }
      expect(validateData(t, data).valid).toBe(true)
    }
  })

  it('treats empty / missing texts[jsonKey] as no-link (no error)', () => {
    const t = template([linkedField])
    const empty: InputJSON = { texts: { name: 'Alice', profile_url: '' }, images: {}, tables: {} }
    const missing: InputJSON = { texts: { name: 'Alice' }, images: {}, tables: {} }
    expect(validateData(t, empty)).toEqual({ valid: true, errors: [] })
    expect(validateData(t, missing)).toEqual({ valid: true, errors: [] })
  })

  it('rejects a non-empty value that is not a valid URL', () => {
    const t = template([linkedField])
    const data: InputJSON = {
      texts: { name: 'Alice', profile_url: 'just a string' },
      images: {},
      tables: {},
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
    const data: InputJSON = { texts: { name: 'A', profile_url: url }, images: {}, tables: {} }
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
})
