/**
 * #61 — validator gates for header/footer/page-number misconfiguration.
 */
import { validateManifest } from '../src/validateManifest.js'
import type { TemplateGoblinError } from '@template-goblin/types'
import type { TemplateManifest } from '@template-goblin/types'
import { dynText, staticTable, makeManifest } from './helpers/fixtures.js'

function bareManifest(overrides: Partial<TemplateManifest>): TemplateManifest {
  return makeManifest(overrides)
}

describe('validateManifest — bands (gated)', () => {
  it('legacy manifest without header/footer/pageNumber passes', () => {
    const m = bareManifest({
      fields: [dynText('body', 'k', false, { y: 100 })],
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('FIELD_OVERLAPS_BAND when body field intrudes into header Y-range', () => {
    const m = bareManifest({
      fields: [dynText('overlap', 'k', false, { y: 10, height: 30 })],
      header: {
        enabled: true,

        style: {
          height: 50,
          backgroundColor: null,
          divider: null,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
        fields: [],
        applyToFirstPage: true,
      },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'FIELD_OVERLAPS_BAND' }) as unknown as TemplateGoblinError,
    )
  })

  it('FIELD_OVERLAPS_BAND when body field bottom crosses footer Y-range', () => {
    const meta = bareManifest({}).meta
    const m = bareManifest({
      fields: [dynText('overlap', 'k', false, { y: meta.height - 40, height: 30 })],
      footer: {
        enabled: true,

        style: {
          height: 50,
          backgroundColor: null,
          divider: null,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
        fields: [],
        applyToFirstPage: true,
      },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'FIELD_OVERLAPS_BAND' }) as unknown as TemplateGoblinError,
    )
  })

  it('PAGE_NUMBER_PLACEMENT_INVALID when placement is header but header is undefined', () => {
    const m = bareManifest({
      fields: [],
      pageNumber: {
        enabled: true,
        placement: 'header',
        align: 'center',
        color: '#000',
        numeralStyle: 'arabic',
        fontFamily: 'Helvetica',
        fontSize: 10,
        showOnFirstPage: false,
      },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({
        code: 'PAGE_NUMBER_PLACEMENT_INVALID',
      }) as unknown as TemplateGoblinError,
    )
  })

  it('PAGE_NUMBER_PLACEMENT_INVALID symmetric for footer', () => {
    const m = bareManifest({
      fields: [],
      pageNumber: {
        enabled: true,
        placement: 'footer',
        align: 'center',
        color: '#000',
        numeralStyle: 'arabic',
        fontFamily: 'Helvetica',
        fontSize: 10,
        showOnFirstPage: false,
      },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({
        code: 'PAGE_NUMBER_PLACEMENT_INVALID',
      }) as unknown as TemplateGoblinError,
    )
  })

  it('rejects table-type fields placed in a header band (decision C)', () => {
    const m = bareManifest({
      fields: [],
      header: {
        enabled: true,

        style: {
          height: 80,
          backgroundColor: null,
          divider: null,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
        fields: [staticTable('tbl-in-band', ['name'], [{ name: 'A' }], { x: 0, y: 0 })],
        applyToFirstPage: true,
      },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'INVALID_MANIFEST' }) as unknown as TemplateGoblinError,
    )
  })

  it('disabled header band does NOT flag body fields in its former Y-range', () => {
    // UI hide-band migrates band fields into body with absolute coords;
    // the band stays in the manifest as `enabled: false` so re-show can
    // restore it. A disabled band paints nothing at PDF time, so the
    // body fields it left behind must NOT trip FIELD_OVERLAPS_BAND.
    const m = bareManifest({
      fields: [dynText('migrated', 'k', false, { y: 10, height: 20 })],
      header: {
        enabled: false,
        style: {
          height: 50,
          backgroundColor: null,
          divider: null,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
        fields: [],
        applyToFirstPage: true,
      },
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('disabled footer band does NOT flag body fields in its former Y-range', () => {
    const m = bareManifest({
      meta: { ...makeManifest({}).meta, height: 842 },
      fields: [dynText('migrated-footer', 'k', false, { y: 820, height: 20 })],
      footer: {
        enabled: false,
        style: {
          height: 50,
          backgroundColor: null,
          divider: null,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
        fields: [],
        applyToFirstPage: true,
      },
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('pageNumber.enabled = false bypasses placement validation', () => {
    const m = bareManifest({
      fields: [],
      pageNumber: {
        enabled: false,
        placement: 'header',
        align: 'center',
        color: '#000',
        numeralStyle: 'arabic',
        fontFamily: 'Helvetica',
        fontSize: 10,
        showOnFirstPage: false,
      },
    })
    expect(() => validateManifest(m)).not.toThrow()
  })
})
