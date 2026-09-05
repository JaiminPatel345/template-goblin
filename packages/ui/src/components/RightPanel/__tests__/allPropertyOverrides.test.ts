import { describe, it, expect } from 'vitest'
import { getAvailableProperties } from '../propertyDefinitions.js'
import {
  extractSelectedPropIds,
  removePropertyOverride,
  togglePropertyOverride,
} from '../propertyOverrideHelpers.js'

describe('All Property Overrides Coverage (Text, Image, Table)', () => {
  const baseTextStyle = {
    fontFamily: 'Helvetica',
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#ffffff',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    overflowMode: 'truncate',
    fontSizeMin: 8,
    align: 'left',
    verticalAlign: 'top',
    maxRows: 2,
    lineHeight: 1.4,
    trim: false,
    rotation: 0,
    groupId: 'txt-grp',
    hyperlink: { mode: 'static', url: 'https://example.com' },
  }

  const baseImageStyle = {
    fit: 'contain',
    color: '#aabbcc',
    filename: 'img.png',
    rotation: 15,
    groupId: 'img-grp',
    hyperlink: { mode: 'static', url: 'https://image.com' },
  }

  const baseTableStyle = {
    maxRows: 10,
    maxColumns: 4,
    multiPage: false,
    showHeader: false,
    fitToContent: false,
    rotation: 0,
    groupId: 'tbl-grp',
    hyperlink: { mode: 'static', url: 'https://tbl.com' },
    headerStyle: {
      fontFamily: 'Helvetica',
      fontSize: 12,
      fontWeight: 'bold',
      fontStyle: 'italic',
      textDecoration: 'underline',
      color: '#ffffff',
      backgroundColor: '#333333',
      align: 'center',
      verticalAlign: 'middle',
    },
    rowStyle: {
      fontFamily: 'Courier',
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#222222',
      backgroundColor: '#f5f5f5',
      align: 'left',
      verticalAlign: 'top',
      borderWidth: 1,
      borderColor: '#dddddd',
      paddingTop: 6,
      paddingBottom: 6,
      paddingLeft: 8,
      paddingRight: 8,
    },
    tableBorder: { width: 2, color: '#000000' },
    cellStyle: { overflowMode: 'truncate' },
  }

  it('verifies toggling on and off every single Text property (17 properties)', () => {
    const textProps = getAvailableProperties('text')
    expect(textProps.length).toBe(17)

    for (const prop of textProps) {
      const toggledOn = togglePropertyOverride({}, baseTextStyle, prop.id, true)
      const extracted = extractSelectedPropIds(toggledOn)
      expect(extracted).toContain(prop.id)

      const toggledOff = togglePropertyOverride(toggledOn, baseTextStyle, prop.id, false)
      const extractedAfter = extractSelectedPropIds(toggledOff)
      expect(extractedAfter).not.toContain(prop.id)
    }
  })

  it('verifies toggling on and off every single Image property (6 properties)', () => {
    const imageProps = getAvailableProperties('image')
    expect(imageProps.length).toBe(6)

    for (const prop of imageProps) {
      const toggledOn = togglePropertyOverride({}, baseImageStyle, prop.id, true)
      const extracted = extractSelectedPropIds(toggledOn)
      expect(extracted).toContain(prop.id)

      const toggledOff = togglePropertyOverride(toggledOn, baseImageStyle, prop.id, false)
      const extractedAfter = extractSelectedPropIds(toggledOff)
      expect(extractedAfter).not.toContain(prop.id)
    }
  })

  it('verifies toggling on and off every single Table property (35 properties)', () => {
    const tableProps = getAvailableProperties('table')
    expect(tableProps.length).toBe(35)

    for (const prop of tableProps) {
      const toggledOn = togglePropertyOverride({}, baseTableStyle, prop.id, true)
      const extracted = extractSelectedPropIds(toggledOn)
      expect(extracted).toContain(prop.id)

      const toggledOff = togglePropertyOverride(toggledOn, baseTableStyle, prop.id, false)
      const extractedAfter = extractSelectedPropIds(toggledOff)
      expect(extractedAfter).not.toContain(prop.id)
      // When the only property was removed, nested parents should be pruned
      expect(toggledOff.headerStyle).toBeUndefined()
      expect(toggledOff.rowStyle).toBeUndefined()
      expect(toggledOff.tableBorder).toBeUndefined()
      expect(toggledOff.cellStyle).toBeUndefined()
    }
  })

  it('edge case: preserves boolean false values when toggling on', () => {
    const textStyle = togglePropertyOverride({}, baseTextStyle, 'trim', true)
    expect(textStyle.trim).toBe(false)

    const multiPageStyle = togglePropertyOverride({}, baseTableStyle, 'multiPage', true)
    expect(multiPageStyle.multiPage).toBe(false)

    const showHeaderStyle = togglePropertyOverride({}, baseTableStyle, 'showHeader', true)
    expect(showHeaderStyle.showHeader).toBe(false)

    const fitToContentStyle = togglePropertyOverride({}, baseTableStyle, 'fitToContent', true)
    expect(fitToContentStyle.fitToContent).toBe(false)
  })

  it('edge case: preserves sibling properties on partial removal', () => {
    const tableWithSiblings = {
      headerStyle: { fontFamily: 'Helvetica', fontSize: 16 },
      rowStyle: { paddingTop: 4, paddingBottom: 4 },
      tableBorder: { width: 1, color: '#333' },
    }

    const removedHeaderFont = removePropertyOverride(tableWithSiblings, 'headerFontFamily')
    expect((removedHeaderFont.headerStyle as Record<string, unknown>)?.fontSize).toBe(16)
    expect((removedHeaderFont.headerStyle as Record<string, unknown>)?.fontFamily).toBeUndefined()

    const removedPaddingTop = removePropertyOverride(removedHeaderFont, 'paddingTop')
    expect((removedPaddingTop.rowStyle as Record<string, unknown>)?.paddingBottom).toBe(4)
    expect((removedPaddingTop.rowStyle as Record<string, unknown>)?.paddingTop).toBeUndefined()

    const removedBorderWidth = removePropertyOverride(removedPaddingTop, 'tableBorderWidth')
    expect((removedBorderWidth.tableBorder as Record<string, unknown>)?.color).toBe('#333')
    expect((removedBorderWidth.tableBorder as Record<string, unknown>)?.width).toBeUndefined()
  })

  it('edge case: prunes empty parent objects when last nested property is removed', () => {
    const singleNested = {
      headerStyle: { fontSize: 16 },
      rowStyle: { borderWidth: 2 },
      tableBorder: { width: 3 },
      cellStyle: { overflowMode: 'truncate' },
    }

    const s1 = removePropertyOverride(singleNested, 'headerFontSize')
    expect(s1.headerStyle).toBeUndefined()

    const s2 = removePropertyOverride(s1, 'cellBorderWidth')
    expect(s2.rowStyle).toBeUndefined()

    const s3 = removePropertyOverride(s2, 'tableBorderWidth')
    expect(s3.tableBorder).toBeUndefined()

    const s4 = removePropertyOverride(s3, 'tableOverflowMode')
    expect(s4.cellStyle).toBeUndefined()
  })
})
