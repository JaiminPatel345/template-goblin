/**
 * QA tests for `createDefaultField` + default style factories.
 * Written from specs 010/011/012 and design §8 (static-dynamic-fields).
 *
 * Per CLAUDE.md: QA reads specs, not implementation, to decide what to test.
 * Implementation was only inspected to discover which symbols are exported.
 */
import { describe, it, expect } from 'vitest'
import {
  createDefaultField,
  defaultCellStyle,
  defaultTextStyle,
  defaultImageStyle,
  defaultTableStyle,
} from '../defaults.js'
import type {
  DynamicSource,
  TextField,
  ImageField,
  TableField,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
} from '@template-goblin/types'

const GEOM = {
  id: 'f1',
  pageId: null,
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  zIndex: 0,
}

// ---------------------------------------------------------------------------
// createDefaultField — per design §3 (FieldSource), specs 010/011/012
// ---------------------------------------------------------------------------

describe('createDefaultField: shared source shape', () => {
  it('text default is dynamic-mode with empty jsonKey, required true, placeholder null', () => {
    const f = createDefaultField('text', GEOM) as TextField
    expect(f.source.mode).toBe('dynamic')
    const ds = f.source as DynamicSource<string>
    expect(ds.jsonKey).toBe('')
    expect(ds.required).toBe(true)
    expect(ds.placeholder).toBeNull()
  })

  it('image default is dynamic-mode with empty jsonKey, required true, placeholder null', () => {
    const f = createDefaultField('image', GEOM) as ImageField
    expect(f.source.mode).toBe('dynamic')
    const ds = f.source as DynamicSource<{ filename: string }>
    expect(ds.jsonKey).toBe('')
    expect(ds.required).toBe(true)
    expect(ds.placeholder).toBeNull()
  })

  it('table default is dynamic-mode with empty jsonKey, required true, placeholder null', () => {
    const f = createDefaultField('table', GEOM) as TableField
    expect(f.source.mode).toBe('dynamic')
    const ds = f.source as DynamicSource<unknown>
    expect(ds.jsonKey).toBe('')
    expect(ds.required).toBe(true)
    expect(ds.placeholder).toBeNull()
  })
})

describe('createDefaultField: geometry', () => {
  it.each(['text', 'image', 'table'] as const)(
    'preserves the caller-supplied geometry for %s fields',
    (type) => {
      const f = createDefaultField(type, GEOM)
      expect(f.id).toBe('f1')
      expect(f.x).toBe(10)
      expect(f.y).toBe(20)
      expect(f.width).toBe(100)
      expect(f.height).toBe(50)
      expect(f.zIndex).toBe(0)
      expect(f.pageId).toBeNull()
      expect(f.groupId).toBeNull()
      expect(f.type).toBe(type)
    },
  )
})

// ---------------------------------------------------------------------------
// defaultTextStyle — spec 010 §Happy Path "pre-filled with defaults"
// ---------------------------------------------------------------------------

describe('defaultTextStyle', () => {
  it('contains all TextFieldStyle keys', () => {
    const style = defaultTextStyle()
    const expectedKeys: (keyof TextFieldStyle)[] = [
      'fontId',
      'fontFamily',
      'fontSize',
      'fontSizeDynamic',
      'fontSizeMin',
      'lineHeight',
      'fontWeight',
      'fontStyle',
      'textDecoration',
      'color',
      'align',
      'verticalAlign',
      'maxRows',
      'overflowMode',
      'snapToGrid',
    ]
    for (const k of expectedKeys) {
      expect(style).toHaveProperty(k)
    }
  })

  it('fontFamily is Helvetica (PDFKit built-in, per spec 010 REQ-010)', () => {
    expect(defaultTextStyle().fontFamily).toBe('Helvetica')
  })

  it('overflowMode is one of the allowed values (spec 010 REQ-013)', () => {
    expect(['dynamic_font', 'truncate']).toContain(defaultTextStyle().overflowMode)
  })

  it('fontSize is a positive number (spec 010 edge case: min 1)', () => {
    expect(defaultTextStyle().fontSize).toBeGreaterThan(0)
  })

  it('lineHeight is >= 0.5 (spec 010 edge case: min 0.5)', () => {
    expect(defaultTextStyle().lineHeight).toBeGreaterThanOrEqual(0.5)
  })

  it('maxRows is >= 1 (spec 010 edge case: min 1)', () => {
    expect(defaultTextStyle().maxRows).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// defaultImageStyle — spec 011 §Happy Path "fit contain"
// ---------------------------------------------------------------------------

describe('defaultImageStyle', () => {
  it('returns { fit: "contain" } per spec 011 §Happy Path step 4', () => {
    const style = defaultImageStyle()
    expect(style).toEqual<ImageFieldStyle>({ fit: 'contain' })
  })

  it('fit is one of the three spec-allowed values', () => {
    expect(['fill', 'contain', 'cover']).toContain(defaultImageStyle().fit)
  })
})

// ---------------------------------------------------------------------------
// defaultTableStyle — spec 012 §Happy Path + design §8 advanced styling
// ---------------------------------------------------------------------------

describe('defaultTableStyle', () => {
  it('showHeader defaults to true (design §4 / §8: header hiding is opt-out)', () => {
    expect(defaultTableStyle().showHeader).toBe(true)
  })

  it('oddRowStyle / evenRowStyle default to null (design §8: zebra off by default)', () => {
    const s = defaultTableStyle()
    expect(s.oddRowStyle).toBeNull()
    expect(s.evenRowStyle).toBeNull()
  })

  it('columns is an empty array (design §8.1: static/dynamic table, user adds columns)', () => {
    expect(defaultTableStyle().columns).toEqual([])
  })

  it('multiPage defaults to false (spec 012 §Happy Path step 4)', () => {
    expect(defaultTableStyle().multiPage).toBe(false)
  })

  it('cellStyle.overflowMode is one of the allowed values (spec 012 REQ-014)', () => {
    const style: TableFieldStyle = defaultTableStyle()
    expect(['dynamic_font', 'truncate']).toContain(style.cellStyle.overflowMode)
  })

  it('headerStyle has fontWeight bold (spec 012 REQ-013 "default bold")', () => {
    expect(defaultTableStyle().headerStyle.fontWeight).toBe('bold')
  })

  it('headerStyle and rowStyle contain all CellStyle keys', () => {
    const s = defaultTableStyle()
    const cellKeys = Object.keys(defaultCellStyle())
    for (const k of cellKeys) {
      expect(s.headerStyle).toHaveProperty(k)
      expect(s.rowStyle).toHaveProperty(k)
    }
  })
})
