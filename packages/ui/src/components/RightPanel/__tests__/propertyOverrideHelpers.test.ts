import { describe, it, expect } from 'vitest'
import {
  extractSelectedPropIds,
  removePropertyOverride,
  togglePropertyOverride,
} from '../propertyOverrideHelpers'

describe('propertyOverrideHelpers', () => {
  it('extractSelectedPropIds extracts flat and nested table keys accurately', () => {
    const empty = extractSelectedPropIds(undefined)
    expect(empty).toEqual([])

    const textStyle = {
      color: '#ff0000',
      fontSize: 16,
    }
    expect(extractSelectedPropIds(textStyle).sort()).toEqual(['color', 'fontSize'].sort())

    const tableStyle = {
      headerStyle: {
        fontFamily: 'Roboto',
        color: '#ffffff',
      },
      rowStyle: {
        fontSize: 12,
      },
      tableBorder: {
        width: 2,
      },
    }
    const propIds = extractSelectedPropIds(tableStyle)
    expect(propIds.sort()).toEqual(
      ['headerFontFamily', 'headerTextColor', 'rowFontSize', 'tableBorderWidth'].sort(),
    )
  })

  it('removePropertyOverride cleanly removes flat and nested properties without leaving empty objects', () => {
    const textStyle = { color: '#ff0000', fontSize: 16 }
    const updated = removePropertyOverride(textStyle, 'color')
    expect(updated).toEqual({ fontSize: 16 })

    const tableStyle = {
      headerStyle: {
        color: '#ffffff',
      },
      rowStyle: {
        fontSize: 12,
      },
    }
    // Removing headerTextColor should completely prune headerStyle when empty
    const withoutHeaderColor = removePropertyOverride(tableStyle, 'headerTextColor')
    expect(withoutHeaderColor.headerStyle).toBeUndefined()
    expect(withoutHeaderColor.rowStyle).toBeDefined()
  })

  it('extractSelectedPropIds extracts all table settings, cell padding, and cell overflow mode', () => {
    const fullTableStyle = {
      maxRows: 20,
      maxColumns: 8,
      multiPage: false,
      showHeader: false,
      fitToContent: false,
      headerStyle: {
        fontWeight: 'bold',
        fontStyle: 'italic',
        textDecoration: 'underline',
        verticalAlign: 'bottom',
      },
      rowStyle: {
        fontWeight: 'normal',
        borderWidth: 2,
        borderColor: '#333333',
        paddingTop: 8,
        paddingBottom: 6,
        paddingLeft: 10,
        paddingRight: 10,
      },
      cellStyle: {
        overflowMode: 'truncate',
      },
      rotation: 45,
    }

    const propIds = extractSelectedPropIds(fullTableStyle)
    expect(propIds).toContain('maxRows')
    expect(propIds).toContain('maxColumns')
    expect(propIds).toContain('multiPage')
    expect(propIds).toContain('showHeader')
    expect(propIds).toContain('fitToContent')
    expect(propIds).toContain('headerFontWeight')
    expect(propIds).toContain('headerFontStyle')
    expect(propIds).toContain('headerTextDecoration')
    expect(propIds).toContain('headerVerticalAlign')
    expect(propIds).toContain('rowFontWeight')
    expect(propIds).toContain('cellBorderWidth')
    expect(propIds).toContain('cellBorderColor')
    expect(propIds).toContain('paddingTop')
    expect(propIds).toContain('paddingBottom')
    expect(propIds).toContain('paddingLeft')
    expect(propIds).toContain('paddingRight')
    expect(propIds).toContain('tableOverflowMode')
    expect(propIds).toContain('rotation')
  })

  it('removePropertyOverride cleanly removes cell padding and pruning cellStyle', () => {
    const tableStyle = {
      cellStyle: { overflowMode: 'truncate' },
      rowStyle: { paddingTop: 8 },
    }
    const withoutOverflow = removePropertyOverride(tableStyle, 'tableOverflowMode')
    expect(withoutOverflow.cellStyle).toBeUndefined()
    expect(withoutOverflow.rowStyle).toBeDefined()

    const withoutPadding = removePropertyOverride(withoutOverflow, 'paddingTop')
    expect(withoutPadding.rowStyle).toBeUndefined()
  })

  it('togglePropertyOverride supports rotation and table settings', () => {
    const baseStyle = {
      rotation: 90,
      maxRows: 15,
      rowStyle: { paddingTop: 6 },
    }
    const initial: Record<string, unknown> = {}

    const withRotation = togglePropertyOverride(initial, baseStyle, 'rotation', true)
    expect(withRotation.rotation).toBe(90)

    const withPadding = togglePropertyOverride(withRotation, baseStyle, 'paddingTop', true)
    expect((withPadding.rowStyle as Record<string, unknown>).paddingTop).toBe(6)

    const removedRotation = togglePropertyOverride(withPadding, baseStyle, 'rotation', false)
    expect(removedRotation.rotation).toBeUndefined()
  })
})
