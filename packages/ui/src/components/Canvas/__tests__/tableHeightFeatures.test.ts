import { describe, it, expect } from 'vitest'
import {
  resolveTableHeightMode,
  type TableField,
  type TableHeightMode,
} from '@template-goblin/types'
import { buildDynamicTableIndicators } from '../tableDynamicIndicator.js'

function createTestTable(
  heightMode?: 'fixed' | 'single_page_dynamic' | 'multipage',
  multiPage = false,
): TableField {
  return {
    id: 'tbl1',
    type: 'table',
    label: 'Table 1',
    pageId: null,
    groupId: null,
    x: 10,
    y: 20,
    width: 300,
    height: 100,
    zIndex: 1,
    source: { mode: 'dynamic', jsonKey: 'items', required: true, placeholder: [] },
    style: {
      heightMode,
      multiPage,
      showHeader: true,
      fitToContent: false,
      maxRows: 10,
      maxColumns: 2,
      columns: [{ key: 'c1', label: 'Col 1', width: 100, style: null, headerStyle: null }],
      headerStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000',
        backgroundColor: null,
        borderWidth: 1,
        borderColor: '#000',
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 2,
        paddingRight: 2,
        align: 'left',
        verticalAlign: 'middle',
      },
      rowStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000',
        backgroundColor: null,
        borderWidth: 1,
        borderColor: '#000',
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 2,
        paddingRight: 2,
        align: 'left',
        verticalAlign: 'middle',
      },
      oddRowStyle: null,
      evenRowStyle: null,
      cellStyle: { overflowMode: 'truncate' },
    },
  }
}

describe('resolveTableHeightMode', () => {
  it('resolves explicit heightMode when present', () => {
    expect(resolveTableHeightMode({ heightMode: 'single_page_dynamic', multiPage: false })).toBe(
      'single_page_dynamic',
    )
    expect(resolveTableHeightMode({ heightMode: 'multipage', multiPage: false })).toBe('multipage')
    expect(resolveTableHeightMode({ heightMode: 'fixed', multiPage: true })).toBe('fixed')
  })

  it('falls back to legacy multiPage flag when heightMode is omitted', () => {
    expect(resolveTableHeightMode({ multiPage: true })).toBe('multipage')
    expect(resolveTableHeightMode({ multiPage: false })).toBe('fixed')
    expect(resolveTableHeightMode({})).toBe('fixed')
    expect(resolveTableHeightMode(undefined)).toBe('fixed')
  })
})

describe('buildDynamicTableIndicators', () => {
  it('returns empty array for fixed table', () => {
    const table = createTestTable('fixed')
    const indicators = buildDynamicTableIndicators(table, 300, 100)
    expect(indicators).toEqual([])
  })

  it('returns empty array for multipage table', () => {
    const table = createTestTable('multipage')
    const indicators = buildDynamicTableIndicators(table, 300, 100)
    expect(indicators).toEqual([])
  })

  it('returns break lines and indicator badge for single_page_dynamic table', () => {
    const table = createTestTable('single_page_dynamic')
    const indicators = buildDynamicTableIndicators(table, 300, 100)
    expect(indicators.length).toBeGreaterThanOrEqual(3) // line1, line2, badgeBg (and badgeText if DOM present)
  })
})

describe('default table height mode policy', () => {
  it('defaults dynamic tables to single_page_dynamic and static tables to fixed', () => {
    const resolveDefaultTableHeightMode = (
      mode: 'static' | 'dynamic',
      chosen?: TableHeightMode | null,
    ): TableHeightMode => {
      if (mode === 'static') return 'fixed'
      return chosen ?? 'single_page_dynamic'
    }

    expect(resolveDefaultTableHeightMode('dynamic', null)).toBe('single_page_dynamic')
    expect(resolveDefaultTableHeightMode('dynamic', undefined)).toBe('single_page_dynamic')
    expect(resolveDefaultTableHeightMode('dynamic', 'multipage')).toBe('multipage')
    expect(resolveDefaultTableHeightMode('dynamic', 'fixed')).toBe('fixed')
    expect(resolveDefaultTableHeightMode('static', 'single_page_dynamic')).toBe('fixed')
    expect(resolveDefaultTableHeightMode('static', null)).toBe('fixed')
  })
})
