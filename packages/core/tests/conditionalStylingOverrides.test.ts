import type {
  LoadedTemplate,
  TemplateManifest,
  TextField,
  ImageField,
} from '@template-goblin/types'
import { generatePDF } from '../src/generate.js'
import { resolveEffectiveField } from '../src/utils/conditionalStyle.js'
import { dynText, dynImage, makeManifest } from './helpers/fixtures.js'

function loaded(manifest: TemplateManifest): LoadedTemplate {
  return {
    manifest,
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: new Map(),
    placeholders: new Map(),
    staticImages: new Map(),
  }
}

const baseText: TextField = {
  ...dynText('txt1', 'role', false),
  rotation: 45,
  groupId: 'base-group',
  hyperlink: { mode: 'static', url: 'https://base.org' },
  style: {
    fontId: null,
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontSizeMin: 8,
    lineHeight: 1.2,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    backgroundColor: '#ffffff',
    align: 'left',
    verticalAlign: 'top',
    maxRows: 1,
    overflowMode: 'truncate',
    snapToGrid: false,
    trim: true,
  },
}

describe('All Text Property Overrides and Edge Cases', () => {
  it('resolves all 17 text properties simultaneously via active condition', () => {
    const textWithCond: TextField = {
      ...baseText,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-all-text',
            name: 'AllTextProps',
            isDefault: true,
            style: {
              fontFamily: 'Courier',
              fontSize: 18,
              fontSizeMin: 6,
              lineHeight: 1.6,
              fontWeight: 'bold',
              fontStyle: 'italic',
              textDecoration: 'underline',
              color: '#336699',
              backgroundColor: '#ffff00',
              align: 'center',
              verticalAlign: 'middle',
              maxRows: 3,
              overflowMode: 'dynamic_font',
              trim: false,
              rotation: 90,
              groupId: 'new-group',
              hyperlink: { mode: 'static', url: 'https://overridden.org' },
            },
          },
        ],
      },
    }

    const resolved = resolveEffectiveField(textWithCond, {})
    expect(resolved.style.fontFamily).toBe('Courier')
    expect(resolved.style.fontSize).toBe(18)
    expect(resolved.style.fontSizeMin).toBe(6)
    expect(resolved.style.lineHeight).toBe(1.6)
    expect(resolved.style.fontWeight).toBe('bold')
    expect(resolved.style.fontStyle).toBe('italic')
    expect(resolved.style.textDecoration).toBe('underline')
    expect(resolved.style.color).toBe('#336699')
    expect(resolved.style.backgroundColor).toBe('#ffff00')
    expect(resolved.style.align).toBe('center')
    expect(resolved.style.verticalAlign).toBe('middle')
    expect(resolved.style.maxRows).toBe(3)
    expect(resolved.style.overflowMode).toBe('dynamic_font')
    expect(resolved.style.trim).toBe(false)
    expect(resolved.rotation).toBe(90)
    expect(resolved.groupId).toBe('new-group')
    expect(resolved.hyperlink).toEqual({ mode: 'static', url: 'https://overridden.org' })
  })

  it('edge case: preserves falsy boolean trim: false and numeric zero rotation: 0', () => {
    const field: TextField = {
      ...baseText,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-zero',
            name: 'zero_falsy',
            isDefault: true,
            style: { trim: false, rotation: 0, fontSizeMin: 0, backgroundColor: null },
          },
        ],
      },
    }
    const resolved = resolveEffectiveField(field, {})
    expect(resolved.style.trim).toBe(false)
    expect(resolved.rotation).toBe(0)
    expect(resolved.style.fontSizeMin).toBe(0)
    expect(resolved.style.backgroundColor).toBeNull()
  })

  it('edge case: clears groupId and hyperlink when set to null/undefined in rule', () => {
    const field: TextField = {
      ...baseText,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-clear',
            name: 'clear',
            isDefault: true,
            style: { groupId: null, hyperlink: null },
          },
        ],
      },
    }
    const resolved = resolveEffectiveField(field, {})
    expect(resolved.groupId).toBeNull()
    expect(resolved.hyperlink).toBeUndefined()
  })
})

describe('All Image Property Overrides and Edge Cases', () => {
  const baseImg: ImageField = {
    ...dynImage('img1', 'avatar', false),
    rotation: 15,
    groupId: 'old-img-group',
    hyperlink: undefined,
    style: { fit: 'contain' },
  }

  it('resolves all 6 image properties: fit, color, filename, rotation, groupId, hyperlink', () => {
    const imgWithSolidColor: ImageField = {
      ...baseImg,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-img-color',
            name: 'solid_red',
            isDefault: true,
            style: {
              fit: 'cover',
              color: '#ff0000',
              rotation: 180,
              groupId: 'img-grp-2',
              hyperlink: { mode: 'static', url: 'https://images.dev' },
            },
          },
        ],
      },
    }
    const resColor = resolveEffectiveField(imgWithSolidColor, {})
    expect(resColor.style.fit).toBe('cover')
    expect(resColor.source).toEqual({ mode: 'static', value: { color: '#ff0000' } })
    expect(resColor.rotation).toBe(180)
    expect(resColor.groupId).toBe('img-grp-2')
    expect(resColor.hyperlink).toEqual({ mode: 'static', url: 'https://images.dev' })

    const imgWithFilename: ImageField = {
      ...baseImg,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-img-file',
            name: 'custom_file',
            isDefault: true,
            style: { fit: 'fill', filename: 'replaced.png' },
          },
        ],
      },
    }
    const resFile = resolveEffectiveField(imgWithFilename, {})
    expect(resFile.style.fit).toBe('fill')
    expect(resFile.source).toEqual({ mode: 'static', value: { filename: 'replaced.png' } })
  })

  it('generates PDF with dynamic hyperlink resolved from condition data', async () => {
    const fieldWithDynLink: TextField = {
      ...baseText,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-dyn-link',
            name: 'web',
            isDefault: true,
            style: { hyperlink: { mode: 'dynamic', jsonKey: 'user_url' } },
          },
        ],
      },
    }
    const manifest = makeManifest({ fields: [fieldWithDynLink] })
    const pdf = await generatePDF(loaded(manifest), {
      texts: { role: 'Admin', user_url: 'https://example.com/admin' },
      images: {},
      tables: {},
    })
    expect(pdf.length).toBeGreaterThan(0)
  })
})
