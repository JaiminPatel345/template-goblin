import type { TableField } from '@template-goblin/types'
import { resolveEffectiveField } from '../src/utils/conditionalStyle.js'
import { dynTable } from './helpers/fixtures.js'

describe('All Table Property Overrides and Edge Cases', () => {
  const baseTable: TableField = {
    ...dynTable('tbl1', 'data_key', false, ['col1', 'col2']),
    rotation: 0,
    groupId: null,
    hyperlink: undefined,
    style: {
      maxRows: 10,
      maxColumns: 2,
      multiPage: true,
      showHeader: true,
      fitToContent: true,
      headerStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#111111',
        backgroundColor: '#eeeeee',
        align: 'left',
        verticalAlign: 'middle',
      },
      rowStyle: {
        fontFamily: 'Helvetica',
        fontSize: 9,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#222222',
        backgroundColor: '#ffffff',
        align: 'left',
        verticalAlign: 'top',
        borderWidth: 1,
        borderColor: '#cccccc',
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 4,
        paddingRight: 4,
      },
      tableBorder: { width: 2, color: '#000000' },
      cellStyle: { overflowMode: 'truncate' },
      columns: [],
      oddRowStyle: null,
      evenRowStyle: null,
    },
  }

  it('resolves all 35 table properties across settings, header, row, borders, padding', () => {
    const tableField: TableField = {
      ...baseTable,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-all-tbl',
            name: 'AllTableProps',
            isDefault: true,
            style: {
              maxRows: 50,
              maxColumns: 10,
              multiPage: false,
              showHeader: false,
              fitToContent: false,
              rotation: 270,
              groupId: 'tbl-group',
              hyperlink: { mode: 'static', url: 'https://table.com' },
              headerStyle: {
                fontFamily: 'Times-Roman',
                fontSize: 14,
                fontWeight: 'normal',
                fontStyle: 'italic',
                textDecoration: 'underline',
                color: '#ff00ff',
                backgroundColor: '#112233',
                align: 'center',
                verticalAlign: 'bottom',
              },
              rowStyle: {
                fontFamily: 'Courier',
                fontSize: 12,
                fontWeight: 'bold',
                fontStyle: 'italic',
                textDecoration: 'strike',
                color: '#334455',
                backgroundColor: '#fafafa',
                align: 'right',
                verticalAlign: 'bottom',
                borderWidth: 3,
                borderColor: '#660000',
                paddingTop: 8,
                paddingBottom: 6,
                paddingLeft: 10,
                paddingRight: 12,
              },
              tableBorder: { width: 4, color: '#ff9900' },
              cellStyle: { overflowMode: 'dynamic_font' },
            },
          },
        ],
      },
    }

    const res = resolveEffectiveField(tableField, {})
    // Settings
    expect(res.style.maxRows).toBe(50)
    expect(res.style.maxColumns).toBe(10)
    expect(res.style.multiPage).toBe(false)
    expect(res.style.showHeader).toBe(false)
    expect(res.style.fitToContent).toBe(false)
    expect(res.rotation).toBe(270)
    expect(res.groupId).toBe('tbl-group')
    expect(res.hyperlink).toEqual({ mode: 'static', url: 'https://table.com' })

    // Header (all 9)
    expect(res.style.headerStyle.fontFamily).toBe('Times-Roman')
    expect(res.style.headerStyle.fontSize).toBe(14)
    expect(res.style.headerStyle.fontWeight).toBe('normal')
    expect(res.style.headerStyle.fontStyle).toBe('italic')
    expect(res.style.headerStyle.textDecoration).toBe('underline')
    expect(res.style.headerStyle.color).toBe('#ff00ff')
    expect(res.style.headerStyle.backgroundColor).toBe('#112233')
    expect(res.style.headerStyle.align).toBe('center')
    expect(res.style.headerStyle.verticalAlign).toBe('bottom')

    // Row (all 16)
    expect(res.style.rowStyle.fontFamily).toBe('Courier')
    expect(res.style.rowStyle.fontSize).toBe(12)
    expect(res.style.rowStyle.fontWeight).toBe('bold')
    expect(res.style.rowStyle.fontStyle).toBe('italic')
    expect(res.style.rowStyle.textDecoration).toBe('strike')
    expect(res.style.rowStyle.color).toBe('#334455')
    expect(res.style.rowStyle.backgroundColor).toBe('#fafafa')
    expect(res.style.rowStyle.align).toBe('right')
    expect(res.style.rowStyle.verticalAlign).toBe('bottom')
    expect(res.style.rowStyle.borderWidth).toBe(3)
    expect(res.style.rowStyle.borderColor).toBe('#660000')
    expect(res.style.rowStyle.paddingTop).toBe(8)
    expect(res.style.rowStyle.paddingBottom).toBe(6)
    expect(res.style.rowStyle.paddingLeft).toBe(10)
    expect(res.style.rowStyle.paddingRight).toBe(12)

    // Table border & cell style
    expect(res.style.tableBorder?.width).toBe(4)
    expect(res.style.tableBorder?.color).toBe('#ff9900')
    expect(res.style.cellStyle?.overflowMode).toBe('dynamic_font')
  })

  it('edge case: deep merge preserves untouched nested properties', () => {
    const partialTable: TableField = {
      ...baseTable,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-partial',
            name: 'partial',
            isDefault: true,
            style: {
              headerStyle: { color: '#e74c3c' },
              rowStyle: { backgroundColor: '#fcfcfc' },
              tableBorder: { width: 5 },
            },
          },
        ],
      },
    }

    const res = resolveEffectiveField(partialTable, {})
    // Overridden fields
    expect(res.style.headerStyle.color).toBe('#e74c3c')
    expect(res.style.rowStyle.backgroundColor).toBe('#fcfcfc')
    expect(res.style.tableBorder?.width).toBe(5)

    // Preserved un-overridden base fields
    expect(res.style.headerStyle.fontSize).toBe(10)
    expect(res.style.headerStyle.fontFamily).toBe('Helvetica')
    expect(res.style.rowStyle.fontSize).toBe(9)
    expect(res.style.rowStyle.borderWidth).toBe(1)
    expect(res.style.rowStyle.paddingTop).toBe(4)
    expect(res.style.tableBorder?.color).toBe('#000000')
    expect(res.style.cellStyle?.overflowMode).toBe('truncate')
  })

  it('edge case: preserves falsy boolean and 0 values on borders and padding', () => {
    const zeroTable: TableField = {
      ...baseTable,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-zero-tbl',
            name: 'zero_table',
            isDefault: true,
            style: {
              multiPage: false,
              showHeader: false,
              fitToContent: false,
              rowStyle: { borderWidth: 0, paddingTop: 0, paddingLeft: 0 },
              tableBorder: { width: 0, color: null },
            },
          },
        ],
      },
    }

    const res = resolveEffectiveField(zeroTable, {})
    expect(res.style.multiPage).toBe(false)
    expect(res.style.showHeader).toBe(false)
    expect(res.style.fitToContent).toBe(false)
    expect(res.style.rowStyle.borderWidth).toBe(0)
    expect(res.style.rowStyle.paddingTop).toBe(0)
    expect(res.style.rowStyle.paddingLeft).toBe(0)
    expect(res.style.tableBorder?.width).toBe(0)
    expect(res.style.tableBorder?.color).toBeNull()
  })
})
