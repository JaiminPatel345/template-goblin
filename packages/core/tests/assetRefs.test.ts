/**
 * `collectReferencedImageAssets` — the mark phase of the .tgbl writers'
 * orphan sweep. Image pools are append-only while a template is edited
 * (eager deletion would break editor undo); writers persist only what
 * the manifest references, using these sets.
 */
import { collectReferencedImageAssets } from '../src/assetRefs.js'
import { dynImage, dynText, makeManifest, staticImage } from './helpers/fixtures.js'

describe('collectReferencedImageAssets', () => {
  it('returns empty sets for a manifest with no image fields', () => {
    const refs = collectReferencedImageAssets(makeManifest({ fields: [dynText('t1', 'name')] }))
    expect(refs.placeholders.size).toBe(0)
    expect(refs.staticImages.size).toBe(0)
  })

  it('collects dynamic placeholders and static values into separate pools', () => {
    const refs = collectReferencedImageAssets(
      makeManifest({
        fields: [
          dynImage('f1', 'photo', true, {}, undefined, { filename: 'dp.png' }),
          staticImage('f2', 'logo.png'),
        ],
      }),
    )
    expect(refs.placeholders.has('dp.png')).toBe(true)
    expect(refs.staticImages.has('logo.png')).toBe(true)
    // Pools are not cross-contaminated.
    expect(refs.placeholders.has('logo.png')).toBe(false)
    expect(refs.staticImages.has('dp.png')).toBe(false)
  })

  it('matches both the bare and directory-prefixed spellings of a reference', () => {
    const refs = collectReferencedImageAssets(
      makeManifest({
        fields: [
          dynImage('f1', 'a', true, {}, undefined, { filename: 'bare.png' }),
          dynImage('f2', 'b', true, {}, undefined, { filename: 'placeholders/prefixed.png' }),
          staticImage('f3', 'images/pre-static.png'),
        ],
      }),
    )
    expect(refs.placeholders.has('bare.png')).toBe(true)
    expect(refs.placeholders.has('placeholders/bare.png')).toBe(true)
    expect(refs.placeholders.has('prefixed.png')).toBe(true)
    expect(refs.placeholders.has('placeholders/prefixed.png')).toBe(true)
    expect(refs.staticImages.has('pre-static.png')).toBe(true)
    expect(refs.staticImages.has('images/pre-static.png')).toBe(true)
  })

  it('includes header and footer band fields (#61)', () => {
    const bandStyle = {
      height: 60,
      backgroundColor: null,
      divider: null,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 8,
      paddingRight: 8,
    }
    const manifest = makeManifest({ fields: [] })
    manifest.header = {
      enabled: true,
      style: bandStyle,
      fields: [dynImage('h1', 'header_logo', true, {}, undefined, { filename: 'hl.png' })],
    }
    manifest.footer = {
      enabled: true,
      style: { ...bandStyle, height: 40 },
      fields: [staticImage('ft1', 'seal.png')],
    }
    const refs = collectReferencedImageAssets(manifest)
    expect(refs.placeholders.has('hl.png')).toBe(true)
    expect(refs.staticImages.has('seal.png')).toBe(true)
  })

  it('ignores image fields with no filename (null placeholder, solid colour)', () => {
    const colourField = staticImage('f1', 'unused.png')
    // GH #81 — solid-colour static image: value is { color }, no asset.
    ;(colourField.source as { value: unknown }).value = { color: '#ff0000' }
    const refs = collectReferencedImageAssets(
      makeManifest({
        fields: [colourField, dynImage('f2', 'photo', true, {}, undefined, null)],
      }),
    )
    expect(refs.placeholders.size).toBe(0)
    expect(refs.staticImages.size).toBe(0)
  })

  it('is pure — does not modify the manifest', () => {
    const manifest = makeManifest({
      fields: [dynImage('f1', 'photo', true, {}, undefined, { filename: 'dp.png' })],
    })
    const before = JSON.stringify(manifest)
    collectReferencedImageAssets(manifest)
    expect(JSON.stringify(manifest)).toBe(before)
  })
})
