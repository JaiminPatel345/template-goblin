/**
 * IMP-2 — per-type color tokens.
 *
 * Contract from bugs.md → IMP-2:
 *   - Stable color per field type (text / image / table).
 *   - Same token used by the Toolbar buttons AND the canvas rectangles.
 *   - Low-opacity fill so overlaid text remains readable.
 *   - Tokens live in `packages/ui/src/theme/fieldColors.ts` so Toolbar and
 *     CanvasArea import from a single source of truth (not a duplicated
 *     `FIELD_COLORS` constant per file).
 *
 * These tests run against the exported `FIELD_COLORS` map. The Toolbar
 * button JSX currently does not pick per-type tokens — that part of IMP-2
 * is covered in a follow-up (or via visual e2e); we only unit-test the
 * token structure and the invariant that text, image, and table are
 * distinct.
 */
import { describe, it, expect } from 'vitest'
import { FIELD_COLORS } from '../fieldColors'
import type { FieldType } from '@template-goblin/types'

const REQUIRED_KEYS = ['fill', 'stroke', 'text', 'toolbarBg', 'toolbarFg'] as const
const TYPES: FieldType[] = ['text', 'image', 'table']

describe('IMP-2 — FIELD_COLORS token map', () => {
  it('has an entry for every FieldType', () => {
    for (const t of TYPES) {
      expect(FIELD_COLORS[t]).toBeDefined()
    }
  })

  it('each entry has all documented keys', () => {
    for (const t of TYPES) {
      const tokens = FIELD_COLORS[t]
      for (const k of REQUIRED_KEYS) {
        expect(tokens).toHaveProperty(k)
        const value = (tokens as Record<string, unknown>)[k]
        expect(typeof value).toBe('string')
        expect((value as string).length).toBeGreaterThan(0)
      }
    }
  })

  it('text / image / table tokens are all distinct', () => {
    // Pairwise compare the whole object — at least one key must differ.
    expect(FIELD_COLORS.text).not.toEqual(FIELD_COLORS.image)
    expect(FIELD_COLORS.text).not.toEqual(FIELD_COLORS.table)
    expect(FIELD_COLORS.image).not.toEqual(FIELD_COLORS.table)
  })

  it('per-key distinctness: fill colors differ between types', () => {
    expect(FIELD_COLORS.text.fill).not.toBe(FIELD_COLORS.image.fill)
    expect(FIELD_COLORS.text.fill).not.toBe(FIELD_COLORS.table.fill)
    expect(FIELD_COLORS.image.fill).not.toBe(FIELD_COLORS.table.fill)
  })

  it('per-key distinctness: stroke colors differ between types', () => {
    expect(FIELD_COLORS.text.stroke).not.toBe(FIELD_COLORS.image.stroke)
    expect(FIELD_COLORS.text.stroke).not.toBe(FIELD_COLORS.table.stroke)
    expect(FIELD_COLORS.image.stroke).not.toBe(FIELD_COLORS.table.stroke)
  })

  it('per-key distinctness: toolbar backgrounds differ between types', () => {
    expect(FIELD_COLORS.text.toolbarBg).not.toBe(FIELD_COLORS.image.toolbarBg)
    expect(FIELD_COLORS.text.toolbarBg).not.toBe(FIELD_COLORS.table.toolbarBg)
    expect(FIELD_COLORS.image.toolbarBg).not.toBe(FIELD_COLORS.table.toolbarBg)
  })

  it('fills are semi-transparent (low-opacity) — rgba with alpha < 1', () => {
    for (const t of TYPES) {
      const fill = FIELD_COLORS[t].fill
      // Accept rgba(), hsla(), or any string with an alpha component.
      const rgbaMatch = fill.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/i)
      const hslaMatch = fill.match(/hsla?\(.+?,\s*([0-9.]+)\s*\)/i)
      const alpha = rgbaMatch?.[1] ?? hslaMatch?.[1]
      expect(alpha, `${t}.fill "${fill}" has no alpha component`).toBeDefined()
      const a = Number(alpha)
      expect(a).toBeGreaterThan(0)
      expect(a).toBeLessThan(1)
    }
  })

  it('toolbar fg is a solid (non-rgba-with-alpha) colour so icon contrast is reliable', () => {
    // Not a hard requirement but the ticket calls out readability.
    for (const t of TYPES) {
      const fg = FIELD_COLORS[t].toolbarFg
      // Either a hex color or a fully-opaque rgb/rgba. Reject translucent.
      const rgbaMatch = fg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/i)
      if (rgbaMatch) {
        expect(Number(rgbaMatch[1])).toBeCloseTo(1, 2)
      } else {
        expect(fg).toMatch(/^#|^rgb\(/)
      }
    }
  })
})
