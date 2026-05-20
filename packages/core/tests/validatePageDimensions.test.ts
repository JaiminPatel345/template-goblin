/**
 * Defence-in-depth: `validateManifest` rejects manifests with non-positive
 * or non-finite page dimensions before PDFKit ever sees them. The UI
 * clamps width / height at input time, but a hand-edited `.tgbl` or a
 * server endpoint accepting a manifest body could still arrive here with
 * `meta.width = -100` etc. — PDFKit silently emits a corrupted PDF on
 * those, so we surface a clean validation error instead.
 */
import { validateManifest } from '../src/validateManifest.js'
import type { TemplateGoblinError } from '@template-goblin/types'
import type { TemplateManifest } from '@template-goblin/types'
import { makeManifest } from './helpers/fixtures.js'

function metaWith(overrides: Partial<{ width: number; height: number }>): TemplateManifest {
  const base = makeManifest({ fields: [] })
  return {
    ...base,
    meta: { ...base.meta, ...overrides },
  }
}

describe('validateManifest — page dimensions', () => {
  it('accepts canonical A4 dimensions', () => {
    expect(() => validateManifest(metaWith({ width: 595, height: 842 }))).not.toThrow()
  })

  it.each([
    ['width', -100],
    ['width', 0],
    ['width', Number.NaN],
    ['width', Number.POSITIVE_INFINITY],
    ['height', -1],
    ['height', 0],
    ['height', Number.NaN],
  ])('rejects %s = %s with INVALID_MANIFEST', (axis, value) => {
    const m = metaWith({ [axis]: value as never } as never)
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'INVALID_MANIFEST' }) as unknown as TemplateGoblinError,
    )
  })

  it('rejects per-page width below 1 even when meta is valid', () => {
    const m = makeManifest({
      fields: [],
      pages: [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#fff',
          backgroundFilename: null,
          width: -50,
          height: 100,
        },
      ],
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'INVALID_MANIFEST' }) as unknown as TemplateGoblinError,
    )
  })

  it('per-page width / height left undefined is allowed (template-meta fallback applies)', () => {
    const m = makeManifest({
      fields: [],
      pages: [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#fff',
          backgroundFilename: null,
        },
      ],
    })
    expect(() => validateManifest(m)).not.toThrow()
  })
})
