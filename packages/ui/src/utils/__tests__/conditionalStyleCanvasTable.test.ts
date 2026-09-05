import { describe, it, expect } from 'vitest'
import type { TableField } from '@template-goblin/types'
import { resolveUiField } from '../conditionalStyle.js'

describe('resolveUiField table resolution and edge cases', () => {
  const baseTableField: TableField = {
    id: 'tbl-1',
    type: 'table',
    groupId: null,
    pageId: null,
    label: 'Grid',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    zIndex: 0,
    style: {
      maxRows: 5,
      maxColumns: 3,
      multiPage: true,
      showHeader: true,
      fitToContent: true,
      headerStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        backgroundColor: '#eeeeee',
        align: 'left',
        verticalAlign: 'top',
        borderWidth: 1,
        borderColor: '#cccccc',
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 4,
        paddingRight: 4,
      },
      rowStyle: {
        fontFamily: 'Helvetica',
        fontSize: 9,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#111111',
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
      tableBorder: { width: 1, color: '#333333' },
      cellStyle: { overflowMode: 'truncate' },
      columns: [],
      oddRowStyle: null,
      evenRowStyle: null,
    },
    source: { mode: 'dynamic', jsonKey: 'table_data', required: false, placeholder: [] },
  }

  it('resolves table deep merge overrides in UI with activeConditionId', () => {
    const tableField: TableField = {
      ...baseTableField,
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c-tbl',
        conditions: [
          {
            id: 'c-tbl',
            name: 'styled_table',
            isDefault: false,
            style: {
              showHeader: false,
              fitToContent: false,
              headerStyle: { color: '#ff0000', fontSize: 14 },
              rowStyle: { backgroundColor: '#ffffcc', paddingTop: 8 },
              tableBorder: { width: 3, color: '#ff0000' },
              cellStyle: { overflowMode: 'dynamic_font' },
            },
          },
        ],
      },
    }
    const resolvedTable = resolveUiField(tableField)
    expect(resolvedTable.style.showHeader).toBe(false)
    expect(resolvedTable.style.fitToContent).toBe(false)
    expect(resolvedTable.style.headerStyle.color).toBe('#ff0000')
    expect(resolvedTable.style.headerStyle.fontSize).toBe(14)
    expect(resolvedTable.style.headerStyle.fontFamily).toBe('Helvetica') // Preserved
    expect(resolvedTable.style.rowStyle.backgroundColor).toBe('#ffffcc')
    expect(resolvedTable.style.rowStyle.paddingTop).toBe(8)
    expect(resolvedTable.style.rowStyle.borderWidth).toBe(1) // Preserved
    expect(resolvedTable.style.tableBorder?.width).toBe(3)
    expect(resolvedTable.style.tableBorder?.color).toBe('#ff0000')
    expect(resolvedTable.style.cellStyle?.overflowMode).toBe('dynamic_font')
  })

  it('edge case: resolves condition from data.condition array when activeConditionId is not set', () => {
    const tableField: TableField = {
      ...baseTableField,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c-def',
            name: 'default_rule',
            isDefault: true,
            style: { headerStyle: { color: '#888888' } },
          },
          {
            id: 'c-special',
            name: 'SpecialTheme',
            isDefault: false,
            style: { headerStyle: { color: '#00aa00' } },
          },
        ],
      },
    }

    const resolvedWithData = resolveUiField(tableField, {
      texts: {},
      images: {},
      tables: {},
      condition: [{ table_data: 'SpecialTheme' }],
    })
    expect(resolvedWithData.style.headerStyle.color).toBe('#00aa00')

    const resolvedFallback = resolveUiField(tableField, {
      texts: {},
      images: {},
      tables: {},
      condition: [{ table_data: 'NonExistent' }],
    })
    expect(resolvedFallback.style.headerStyle.color).toBe('#888888')
  })
})
