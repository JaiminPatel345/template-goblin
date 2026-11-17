import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  resolveTableHeightMode,
  type TableField,
  type TableHeightMode,
} from '@template-goblin/types'
import { buildDynamicTableIndicators } from '../tableDynamicIndicator.js'
import { TableHeightModePicker } from '../TableHeightModePicker.js'
import { TableStyleSections } from '../../RightPanel/TableStyleSections.js'

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

describe('TableHeightModePicker component UI', () => {
  it('renders all options with badges and custom styling', () => {
    const html = renderToStaticMarkup(
      <TableHeightModePicker
        sourceMode="dynamic"
        selected="single_page_dynamic"
        onChange={vi.fn()}
      />,
    )

    expect(html).toContain('Fixed Height')
    expect(html).toContain('Clipped')
    expect(html).toContain('Single Page Dynamic')
    expect(html).toContain('Auto-expands')
    expect(html).toContain('Multi-Page Dynamic')
    expect(html).toContain('Continuation')
    expect(html).toContain('data-testid="table-height-mode-help-btn"')
    expect(html).toContain('table-height-option-fixed')
    expect(html).toContain('table-height-option-single_page_dynamic')
    expect(html).toContain('table-height-option-multipage')
    expect(html).toContain('checked=""')
  })

  it('disables dynamic options and displays dynamic-only tag when sourceMode is static', () => {
    const html = renderToStaticMarkup(
      <TableHeightModePicker sourceMode="static" selected="fixed" onChange={vi.fn()} />,
    )

    expect(html).toContain('disabled=""')
    expect(html).toContain('Dynamic only')
  })
})

describe('TableStyleSections Header Height control', () => {
  it('renders Header Height input with auto placeholder when headerHeight is not set', () => {
    const table = createTestTable('single_page_dynamic')
    const html = renderToStaticMarkup(
      <TableStyleSections field={table} allFontFamilies={['Helvetica']} />,
    )

    expect(html).toContain('Header Height (pt)')
    expect(html).toContain('data-testid="table-header-height-input"')
    // fontSize 10 + paddingTop 2 + paddingBottom 2 = 14pt auto placeholder
    expect(html).toContain('placeholder="Auto (14pt)"')
  })

  it('renders explicit header height value when headerHeight is configured', () => {
    const table = createTestTable('single_page_dynamic')
    table.style.headerHeight = 40
    const html = renderToStaticMarkup(
      <TableStyleSections field={table} allFontFamilies={['Helvetica']} />,
    )

    expect(html).toContain('value="40"')
  })
})
