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

  it('togglePropertyOverride enables a property by pulling from baseStyle', () => {
    const baseStyle = { color: '#123456', fontSize: 18 }
    const initial: Record<string, unknown> = {}

    const withColor = togglePropertyOverride(initial, baseStyle, 'color', true)
    expect(withColor).toEqual({ color: '#123456' })

    const disabled = togglePropertyOverride(withColor, baseStyle, 'color', false)
    expect(disabled).toEqual({})
  })
})
