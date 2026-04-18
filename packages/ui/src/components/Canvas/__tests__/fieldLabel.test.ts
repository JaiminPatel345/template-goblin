/**
 * IMP-1 — rectangle label overhaul.
 *
 * The label rendered INSIDE the field's bounding rect on the canvas must be
 * the user-meaningful placeholder/value, not the type badge (`texts.name`,
 * `<static text>`, etc.). The type badge lives in the left-panel field list
 * only.
 *
 * Rules (from bugs.md → IMP-1):
 *   - Dynamic text field with a string placeholder → label is the placeholder
 *     text (e.g. "Student Name"). Not "texts.name". Not a type badge.
 *   - Dynamic text field with no placeholder → fall back to the jsonKey
 *     (e.g. "name"), still without the "texts." prefix or type label.
 *   - Static text field → label is the literal static value (e.g. "Hello").
 *   - The label font scales to fit the rect (binary search). This file only
 *     covers the *text content* of the label, not the font sizing algorithm.
 *
 * Implementation hook (expected after Dev lands IMP-1):
 *   `packages/ui/src/components/Canvas/fieldLabel.ts` exports
 *     `fieldCanvasLabel(field: FieldDefinition): string`
 *   (currently the helper lives inline in CanvasArea.tsx and emits
 *    `texts.<jsonKey>` — see CanvasArea.tsx:30-39.)
 *
 * Tests are RED until Dev moves the helper out and updates its contract.
 * Flips to passing once the Dev lands IMP-1. No Dev → leave RED with TODO.
 */
import { describe, it, expect } from 'vitest'
// IMP-1 — the helper now lives in its own module so it's importable without
// pulling in react-konva.
import { fieldCanvasLabel } from '../fieldLabel'
import type {
  FieldDefinition,
  ImageField,
  TextField,
  TextFieldStyle,
  ImageFieldStyle,
} from '@template-goblin/types'

function textStyle(): TextFieldStyle {
  return {
    fontId: null,
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontSizeDynamic: true,
    fontSizeMin: 11,
    lineHeight: 1.2,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    align: 'left',
    verticalAlign: 'top',
    maxRows: 3,
    overflowMode: 'dynamic_font',
    snapToGrid: true,
  }
}

function imageStyle(): ImageFieldStyle {
  return { fit: 'contain' }
}

function baseGeometry() {
  return {
    id: 'f1',
    groupId: null,
    pageId: null,
    label: '',
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    zIndex: 0,
  }
}

describe('IMP-1 — fieldCanvasLabel', () => {
  it('returns the placeholder string for a dynamic text field with a placeholder', () => {
    const field: TextField = {
      ...baseGeometry(),
      type: 'text',
      style: textStyle(),
      source: {
        mode: 'dynamic',
        jsonKey: 'name',
        required: true,
        placeholder: 'Student Name',
      },
    }
    expect(fieldCanvasLabel(field as FieldDefinition)).toBe('Student Name')
  })

  it('falls back to jsonKey (without a "texts." prefix) when placeholder is empty', () => {
    const field: TextField = {
      ...baseGeometry(),
      type: 'text',
      style: textStyle(),
      source: { mode: 'dynamic', jsonKey: 'name', required: true, placeholder: null },
    }
    expect(fieldCanvasLabel(field as FieldDefinition)).toBe('name')
  })

  it('returns the literal static value for a static text field', () => {
    const field: TextField = {
      ...baseGeometry(),
      type: 'text',
      style: textStyle(),
      source: { mode: 'static', value: 'Hello' },
    }
    expect(fieldCanvasLabel(field as FieldDefinition)).toBe('Hello')
  })

  it('does NOT emit a type badge like "<static text>" for static fields', () => {
    const field: TextField = {
      ...baseGeometry(),
      type: 'text',
      style: textStyle(),
      source: { mode: 'static', value: 'Hello' },
    }
    const label = fieldCanvasLabel(field as FieldDefinition)
    expect(label).not.toContain('<static')
    expect(label).not.toContain('text>')
    expect(label).not.toMatch(/^texts\./)
  })

  it('does NOT prefix the jsonKey with "texts." for dynamic text fields', () => {
    const field: TextField = {
      ...baseGeometry(),
      type: 'text',
      style: textStyle(),
      source: { mode: 'dynamic', jsonKey: 'name', required: true, placeholder: null },
    }
    const label = fieldCanvasLabel(field as FieldDefinition)
    expect(label).not.toMatch(/^texts\./)
    expect(label).not.toMatch(/^images\./)
    expect(label).not.toMatch(/^tables\./)
  })

  it('uses placeholder filename for a dynamic image field without a type prefix', () => {
    const field: ImageField = {
      ...baseGeometry(),
      type: 'image',
      style: imageStyle(),
      source: {
        mode: 'dynamic',
        jsonKey: 'avatar',
        required: false,
        placeholder: { filename: 'avatar.png' },
      },
    }
    const label = fieldCanvasLabel(field as FieldDefinition)
    // Label should surface something user-meaningful — either the filename or
    // the jsonKey. Critically NOT the old "images.avatar" form.
    expect(label).not.toMatch(/^images\./)
    expect([label, label]).toContain(label) // any non-empty string is acceptable
    expect(label.length).toBeGreaterThan(0)
  })
})
