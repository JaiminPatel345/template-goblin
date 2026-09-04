import type { LoadedTemplate, TemplateManifest } from '@template-goblin/types'
import { generatePDF } from '../src/generate.js'
import { resolveEffectiveField } from '../src/utils/conditionalStyle.js'
import { validateManifest } from '../src/validateManifest.js'
import { dynText, dynImage, staticText, makeManifest } from './helpers/fixtures.js'
import { parsePdfGeometry, pageText } from './helpers/pdfGeometry.js'

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

describe('resolveEffectiveField Unit Logic', () => {
  const baseTextField = {
    ...dynText('txt1', 'user_role', false),
    style: {
      fontId: null,
      fontFamily: 'Helvetica',
      fontSize: 12,
      fontSizeMin: 8,
      lineHeight: 1.2,
      fontWeight: 'normal' as const,
      fontStyle: 'normal' as const,
      textDecoration: 'none' as const,
      color: '#000000',
      align: 'left' as const,
      verticalAlign: 'top' as const,
      maxRows: 1,
      overflowMode: 'truncate' as const,
      snapToGrid: false,
    },
    conditionalStyles: {
      enabled: true,
      conditions: [
        { id: 'c1', name: 'Admin', isDefault: true, style: { color: '#ff0000', fontSize: 20 } },
        { id: 'c2', name: 'User', isDefault: false, style: { color: '#0000ff', fontSize: 14 } },
        { id: 'c3', name: 'Guest', isDefault: false, style: { color: '#888888', fontSize: 10 } },
      ],
    },
  }

  it('returns base field unmodified when conditionalStyles is disabled', () => {
    const disabledField = {
      ...baseTextField,
      conditionalStyles: { ...baseTextField.conditionalStyles, enabled: false },
    }
    const resolved = resolveEffectiveField(disabledField, {
      texts: { user_role: 'User' },
      images: {},
      tables: {},
      condition: 'User',
    })
    expect(resolved.style.color).toBe('#000000')
    expect(resolved.style.fontSize).toBe(12)
  })

  it('case-sensitive matching: non-matching case falls back to default condition', () => {
    const resolved = resolveEffectiveField(baseTextField, {
      texts: { user_role: 'admin' }, // lowercase 'admin' does NOT match 'Admin'
      images: {},
      tables: {},
      condition: 'admin',
    })
    // Falls back to Admin (marked isDefault: true)
    expect(resolved.style.color).toBe('#ff0000')
    expect(resolved.style.fontSize).toBe(20)
  })

  it('data.conditions[field.id] overrides global data.condition', () => {
    const resolved = resolveEffectiveField(baseTextField, {
      texts: { user_role: 'Admin' },
      images: {},
      tables: {},
      condition: 'Admin', // Global condition is Admin
      conditions: { txt1: 'Guest' }, // Field override is Guest
    })
    expect(resolved.style.color).toBe('#888888')
    expect(resolved.style.fontSize).toBe(10)
  })

  it('data.conditions[jsonKey] overrides global data.condition', () => {
    const resolved = resolveEffectiveField(baseTextField, {
      texts: { user_role: 'Admin' },
      images: {},
      tables: {},
      condition: 'Admin',
      conditions: { user_role: 'User' },
    })
    expect(resolved.style.color).toBe('#0000ff')
    expect(resolved.style.fontSize).toBe(14)
  })
})

describe('Manifest Validation for Conditional Styles', () => {
  it('throws INVALID_MANIFEST when conditionalStyles.enabled is not a boolean', () => {
    const badField = {
      ...staticText('s1', 'Static'),
      conditionalStyles: { enabled: 'invalid' as unknown as boolean, conditions: [] },
    }
    const manifest = makeManifest({ fields: [badField] })
    expect(() => validateManifest(manifest)).toThrow(/conditionalStyles.enabled must be a boolean/i)
  })

  it('throws INVALID_MANIFEST when conditionalStyles.conditions is not an array', () => {
    const badField = {
      ...staticText('s1', 'Static'),
      conditionalStyles: { enabled: true, conditions: 'invalid' as unknown as [] },
    }
    const manifest = makeManifest({ fields: [badField] })
    expect(() => validateManifest(manifest)).toThrow(
      /conditionalStyles.conditions must be an array/i,
    )
  })

  it('throws INVALID_MANIFEST when condition rule name is empty', () => {
    const badField = {
      ...staticText('s1', 'Static'),
      conditionalStyles: {
        enabled: true,
        conditions: [{ id: 'c1', name: '  ', isDefault: true, style: {} }],
      },
    }
    const manifest = makeManifest({ fields: [badField] })
    expect(() => validateManifest(manifest)).toThrow(
      /condition rule name must be a non-empty string/i,
    )
  })
})

describe('Condition-Based Styling in Core Renderer', () => {
  it('renders text with active condition overrides', async () => {
    const textF = {
      ...dynText('txt1', 'status', false),
      style: {
        fontId: null,
        fontFamily: 'Helvetica',
        fontSize: 12,
        fontSizeMin: 8,
        lineHeight: 1.2,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        textDecoration: 'none' as const,
        color: '#000000',
        align: 'left' as const,
        verticalAlign: 'top' as const,
        maxRows: 1,
        overflowMode: 'truncate' as const,
        snapToGrid: false,
      },
      conditionalStyles: {
        enabled: true,
        conditions: [
          { id: 'c1', name: 'Active', isDefault: true, style: { color: '#00ff00' } },
          { id: 'c2', name: 'Inactive', isDefault: false, style: { color: '#ff0000' } },
        ],
      },
    }

    const manifest = makeManifest({ fields: [textF] })
    const pdfActive = await generatePDF(loaded(manifest), {
      texts: { status: 'OK' },
      images: {},
      tables: {},
      condition: 'Active',
    })
    const pdfInactive = await generatePDF(loaded(manifest), {
      texts: { status: 'OK' },
      images: {},
      tables: {},
      condition: 'Inactive',
    })

    expect(pdfActive.length).toBeGreaterThan(0)
    expect(pdfInactive.length).toBeGreaterThan(0)
    expect(pdfActive.equals(pdfInactive)).toBe(false)
  })

  it('renders image field with condition style overrides (fit mode)', async () => {
    const imgF = {
      ...dynImage('img1', 'avatar', false),
      style: { fit: 'contain' as const },
      conditionalStyles: {
        enabled: true,
        conditions: [
          { id: 'c1', name: 'Square', isDefault: true, style: { fit: 'fill' as const } },
          { id: 'c2', name: 'Ratio', isDefault: false, style: { fit: 'cover' as const } },
        ],
      },
    }

    const manifest = makeManifest({ fields: [imgF] })
    const pdf = await generatePDF(loaded(manifest), {
      texts: {},
      images: {
        avatar:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      },
      tables: {},
      condition: 'Ratio',
    })

    expect(pdf.length).toBeGreaterThan(0)
  })

  it('renders static fields with conditional styles enabled', async () => {
    const sField = {
      ...staticText('s1', 'Static Heading'),
      conditionalStyles: {
        enabled: true,
        conditions: [
          { id: 'c1', name: 'ThemeDark', isDefault: true, style: { color: '#ffffff' } },
          { id: 'c2', name: 'ThemeLight', isDefault: false, style: { color: '#000000' } },
        ],
      },
    }

    const manifest = makeManifest({ fields: [sField] })
    const pdf = await generatePDF(loaded(manifest), {
      texts: {},
      images: {},
      tables: {},
      condition: 'ThemeLight',
    })

    const pages = await parsePdfGeometry(pdf)
    expect(pageText(pages[0]!)).toContain('Static Heading')
  })
})
