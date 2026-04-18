/**
 * IMP-3 / IMP-4 — conditional rectangle fill.
 *
 * Contract:
 *   IMP-3: If an image field is DYNAMIC and its placeholder file is
 *          present (resolved from the placeholder buffer map), render the
 *          placeholder image directly on the canvas and SKIP the coloured
 *          fill rect underneath it.
 *   IMP-4: Static fields (mode === 'static') have no data contract — they
 *          render their own content; the coloured fill rect is suppressed
 *          for ALL static variants (text, image, table). Border/selection
 *          outline still renders.
 *
 * Implementation hook (expected after Dev lands IMP-3/IMP-4):
 *   `packages/ui/src/components/Canvas/rectFill.ts` exports
 *     `shouldRenderFillRect(
 *        field: FieldDefinition,
 *        opts: { placeholderResolved?: boolean }
 *      ): boolean`
 *
 * Tests are RED until Dev extracts that helper.
 * Flips to passing once the Dev lands IMP-3 + IMP-4. Meanwhile the module
 * does not exist → vitest reports "Cannot find module" which is the
 * deliberate RED state.
 */
import { describe, it, expect } from 'vitest'
import { shouldRenderFillRect } from '../rectFill'
import type {
  FieldDefinition,
  ImageField,
  TableField,
  TextField,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
  CellStyle,
} from '@template-goblin/types'

function cellStyle(): CellStyle {
  return {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#cccccc',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    align: 'left',
    verticalAlign: 'top',
  }
}
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
function imageStyleFn(): ImageFieldStyle {
  return { fit: 'contain' }
}
function tableStyle(): TableFieldStyle {
  return {
    maxRows: 20,
    maxColumns: 5,
    multiPage: false,
    showHeader: true,
    headerStyle: cellStyle(),
    rowStyle: cellStyle(),
    oddRowStyle: null,
    evenRowStyle: null,
    cellStyle: { overflowMode: 'dynamic_font' },
    columns: [],
  }
}
function geom() {
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

describe('IMP-3 / IMP-4 — shouldRenderFillRect', () => {
  /* ---- IMP-4: static fields never show the fill ---- */

  it('IMP-4 — static text field → no fill rect', () => {
    const field: TextField = {
      ...geom(),
      type: 'text',
      style: textStyle(),
      source: { mode: 'static', value: 'Hello' },
    }
    expect(shouldRenderFillRect(field as FieldDefinition, {})).toBe(false)
  })

  it('IMP-4 — static image field → no fill rect', () => {
    const field: ImageField = {
      ...geom(),
      type: 'image',
      style: imageStyleFn(),
      source: { mode: 'static', value: { filename: 'logo.png' } },
    }
    expect(shouldRenderFillRect(field as FieldDefinition, {})).toBe(false)
  })

  it('IMP-4 — static table field → no fill rect', () => {
    const field: TableField = {
      ...geom(),
      type: 'table',
      style: tableStyle(),
      source: { mode: 'static', value: [] },
    }
    expect(shouldRenderFillRect(field as FieldDefinition, {})).toBe(false)
  })

  /* ---- IMP-3: dynamic image with resolved placeholder ---- */

  it('IMP-3 — dynamic image with resolved placeholder → no fill rect', () => {
    const field: ImageField = {
      ...geom(),
      type: 'image',
      style: imageStyleFn(),
      source: {
        mode: 'dynamic',
        jsonKey: 'avatar',
        required: false,
        placeholder: { filename: 'avatar.png' },
      },
    }
    expect(shouldRenderFillRect(field as FieldDefinition, { placeholderResolved: true })).toBe(
      false,
    )
  })

  it('IMP-3 — dynamic image WITHOUT a placeholder → fill rect is rendered', () => {
    const field: ImageField = {
      ...geom(),
      type: 'image',
      style: imageStyleFn(),
      source: { mode: 'dynamic', jsonKey: 'avatar', required: false, placeholder: null },
    }
    expect(shouldRenderFillRect(field as FieldDefinition, { placeholderResolved: false })).toBe(
      true,
    )
  })

  it('IMP-3 — dynamic image with placeholder metadata but unresolved buffer → fill rect', () => {
    // Case: source.placeholder.filename references a file that is not in the
    // placeholderBuffers map (e.g. user-uploaded filename but buffer cleared).
    // We still draw the fill rect because the actual image cannot render.
    const field: ImageField = {
      ...geom(),
      type: 'image',
      style: imageStyleFn(),
      source: {
        mode: 'dynamic',
        jsonKey: 'avatar',
        required: false,
        placeholder: { filename: 'avatar.png' },
      },
    }
    expect(shouldRenderFillRect(field as FieldDefinition, { placeholderResolved: false })).toBe(
      true,
    )
  })

  /* ---- regression guards: dynamic text/table still get the fill ---- */

  it('dynamic text field → fill rect is rendered (unchanged)', () => {
    const field: TextField = {
      ...geom(),
      type: 'text',
      style: textStyle(),
      source: { mode: 'dynamic', jsonKey: 'name', required: true, placeholder: null },
    }
    expect(shouldRenderFillRect(field as FieldDefinition, {})).toBe(true)
  })

  it('dynamic table field → fill rect is rendered (unchanged)', () => {
    const field: TableField = {
      ...geom(),
      type: 'table',
      style: tableStyle(),
      source: { mode: 'dynamic', jsonKey: 'rows', required: true, placeholder: null },
    }
    expect(shouldRenderFillRect(field as FieldDefinition, {})).toBe(true)
  })
})
