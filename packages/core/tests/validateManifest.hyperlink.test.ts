/**
 * Manifest-level validation for `field.hyperlink` (#87).
 *
 * Static URLs are validated end-to-end here (allowed protocols only).
 * Dynamic links only get their `jsonKey` shape checked at design time —
 * the actual URL string is resolved from input data and validated by
 * `validateData`.
 */
import { validateManifest } from '../src/validateManifest.js'
import { TemplateGoblinError } from '@template-goblin/types'
import { dynText, makeManifest, staticImage, staticTable, staticText } from './helpers/fixtures.js'

describe('validateManifest — field.hyperlink', () => {
  it('accepts a text field with a valid static https URL', () => {
    const m = makeManifest({
      fields: [
        { ...staticText('t1', 'hi'), hyperlink: { mode: 'static', url: 'https://example.com' } },
      ],
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it.each([
    ['mailto', 'mailto:foo@example.com'],
    ['tel', 'tel:+1234'],
    ['http', 'http://localhost:3000'],
  ])('accepts %s scheme on a static URL', (_label, url) => {
    const m = makeManifest({
      fields: [{ ...staticText('t1', 'hi'), hyperlink: { mode: 'static', url } }],
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it.each([
    ['ftp', 'ftp://files.example.com'],
    ['javascript', 'javascript:alert(1)'],
    ['empty', ''],
    ['garbage', 'not a url'],
  ])('rejects a static %s URL with INVALID_DATA_TYPE', (_label, url) => {
    const m = makeManifest({
      fields: [{ ...staticText('t1', 'hi'), hyperlink: { mode: 'static', url } }],
    })
    try {
      validateManifest(m)
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_DATA_TYPE')
      expect((err as TemplateGoblinError).message).toMatch(/hyperlink\.url/)
    }
  })

  it('accepts a dynamic hyperlink with a safe jsonKey', () => {
    const m = makeManifest({
      fields: [
        {
          ...dynText('t1', 'name', false),
          hyperlink: { mode: 'dynamic', jsonKey: 'profile_url' },
        },
      ],
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('rejects a dynamic hyperlink with an unsafe jsonKey', () => {
    const m = makeManifest({
      fields: [
        {
          ...dynText('t1', 'name', false),
          hyperlink: { mode: 'dynamic', jsonKey: 'has space' },
        },
      ],
    })
    try {
      validateManifest(m)
      throw new Error('expected throw')
    } catch (err) {
      expect((err as TemplateGoblinError).code).toBe('INVALID_DATA_TYPE')
      expect((err as TemplateGoblinError).message).toMatch(/hyperlink\.jsonKey/)
    }
  })

  it('rejects a hyperlink with an unknown mode', () => {
    const m = makeManifest({
      fields: [
        {
          ...staticText('t1', 'hi'),
          // Cast through unknown so the bad shape compiles for the test.
          hyperlink: { mode: 'lol', url: 'https://x' } as unknown as {
            mode: 'static'
            url: string
          },
        },
      ],
    })
    expect(() => validateManifest(m)).toThrow(TemplateGoblinError)
  })

  it('treats undefined / missing hyperlink as a no-op (not an error)', () => {
    const m = makeManifest({
      fields: [
        staticText('t1', 'plain'),
        staticImage('i1', 'pic.png'),
        staticTable('tbl', ['a'], [{ a: 'x' }]),
      ],
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('accepts a static URL on a table field', () => {
    const m = makeManifest({
      fields: [
        {
          ...staticTable('tbl', ['a'], [{ a: 'x' }]),
          hyperlink: { mode: 'static', url: 'https://example.com' },
        },
      ],
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('accepts a hyperlink on every field type in one manifest', () => {
    const m = makeManifest({
      fields: [
        {
          ...staticText('t1', 'hi'),
          hyperlink: { mode: 'static', url: 'https://text.example.com' },
        },
        {
          ...staticImage('i1', 'pic.png'),
          hyperlink: { mode: 'static', url: 'mailto:foo@example.com' },
        },
        {
          ...staticTable('tb1', ['a'], [{ a: 'x' }]),
          hyperlink: { mode: 'dynamic', jsonKey: 'tab_link' },
        },
      ],
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('rejects a static hyperlink with a non-string url', () => {
    const m = makeManifest({
      fields: [
        {
          ...staticText('t1', 'hi'),
          hyperlink: { mode: 'static', url: 42 } as unknown as { mode: 'static'; url: string },
        },
      ],
    })
    expect(() => validateManifest(m)).toThrow(TemplateGoblinError)
  })

  it('rejects a dynamic hyperlink with a non-string jsonKey', () => {
    const m = makeManifest({
      fields: [
        {
          ...staticText('t1', 'hi'),
          hyperlink: { mode: 'dynamic', jsonKey: 5 } as unknown as {
            mode: 'dynamic'
            jsonKey: string
          },
        },
      ],
    })
    expect(() => validateManifest(m)).toThrow(TemplateGoblinError)
  })

  it('rejects a dynamic hyperlink with an empty jsonKey', () => {
    const m = makeManifest({
      fields: [
        {
          ...staticText('t1', 'hi'),
          hyperlink: { mode: 'dynamic', jsonKey: '' },
        },
      ],
    })
    expect(() => validateManifest(m)).toThrow(TemplateGoblinError)
  })

  it.each([
    ['leading digit', '1url'],
    ['hyphen', 'profile-url'],
    ['dot', 'profile.url'],
    ['unicode', 'üURL'],
  ])('rejects dynamic jsonKey with %s', (_label, key) => {
    const m = makeManifest({
      fields: [
        {
          ...staticText('t1', 'hi'),
          hyperlink: { mode: 'dynamic', jsonKey: key },
        },
      ],
    })
    expect(() => validateManifest(m)).toThrow(TemplateGoblinError)
  })

  it('allows the same dynamic jsonKey across two fields (no DUPLICATE check)', () => {
    // The DUPLICATE_JSON_KEY check is per-type-per-source — hyperlink
    // jsonKeys live in their own `links` bucket and may legitimately be
    // shared by multiple fields (one URL covering several visuals).
    const m = makeManifest({
      fields: [
        {
          ...staticText('t1', 'a'),
          hyperlink: { mode: 'dynamic', jsonKey: 'shared_url' },
        },
        {
          ...staticText('t2', 'b'),
          hyperlink: { mode: 'dynamic', jsonKey: 'shared_url' },
        },
      ],
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('rejects a static URL containing newlines', () => {
    const m = makeManifest({
      fields: [
        {
          ...staticText('t1', 'hi'),
          hyperlink: { mode: 'static', url: 'https://example.com\n<script>' },
        },
      ],
    })
    expect(() => validateManifest(m)).toThrow(TemplateGoblinError)
  })
})
