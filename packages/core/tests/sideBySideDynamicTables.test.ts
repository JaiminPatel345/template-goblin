import { adjustPageLayout } from '../src/utils/dynamicLayout.js'
import type { InputJSON, TableField, TextField } from '@template-goblin/types'

describe('Side-by-side dynamic tables layout', () => {
  it('expands both tables to required heights, shifts lower elements by max bottom reach, and leaves aside elements intact', () => {
    const tableA: TableField = {
      id: 'tableA',
      type: 'table',
      label: 'Table A',
      pageId: null,
      groupId: null,
      x: 50,
      y: 50,
      width: 200,
      height: 80,
      zIndex: 1,
      source: {
        mode: 'dynamic',
        jsonKey: 'itemsA',
        required: true,
        placeholder: [],
      },
      style: {
        heightMode: 'single_page_dynamic',
        columns: [{ key: 'col1', label: 'Col 1', width: 200 }],
        headerStyle: { fontSize: 10, lineHeight: 1.2, paddingTop: 4, paddingBottom: 4 },
        rowStyle: { fontSize: 10, lineHeight: 1.2, paddingTop: 4, paddingBottom: 4 },
        zebra: false,
        borders: false,
      },
    }

    const tableB: TableField = {
      id: 'tableB',
      type: 'table',
      label: 'Table B',
      pageId: null,
      groupId: null,
      x: 300,
      y: 50,
      width: 200,
      height: 80,
      zIndex: 1,
      source: {
        mode: 'dynamic',
        jsonKey: 'itemsB',
        required: true,
        placeholder: [],
      },
      style: {
        heightMode: 'single_page_dynamic',
        columns: [{ key: 'col1', label: 'Col 1', width: 200 }],
        headerStyle: { fontSize: 10, lineHeight: 1.2, paddingTop: 4, paddingBottom: 4 },
        rowStyle: { fontSize: 10, lineHeight: 1.2, paddingTop: 4, paddingBottom: 4 },
        zebra: false,
        borders: false,
      },
    }

    // Element placed horizontally alongside the tables (at y=60, within table Y span 50..130)
    const asideText: TextField = {
      id: 'aside',
      type: 'text',
      label: 'Aside',
      pageId: null,
      groupId: null,
      x: 520,
      y: 60,
      width: 60,
      height: 30,
      zIndex: 2,
      source: { mode: 'static', value: 'Sidebar' },
      style: {
        fontSize: 10,
        color: '#000',
        align: 'left',
        verticalAlign: 'top',
        lineHeight: 1.2,
      },
    }

    // Element placed below the tables (original y=150, which is 20pt below tables' origBottom 130)
    const belowText: TextField = {
      id: 'below',
      type: 'text',
      label: 'Below',
      pageId: null,
      groupId: null,
      x: 50,
      y: 150,
      width: 400,
      height: 30,
      zIndex: 3,
      source: { mode: 'static', value: 'Footer Note' },
      style: {
        fontSize: 10,
        color: '#000',
        align: 'left',
        verticalAlign: 'top',
        lineHeight: 1.2,
      },
    }

    // Row height = fontSize(10) + paddingTop(4) + paddingBottom(4) = 18pt
    // itemsA: 10 data rows + header = 18 + 10 * 18 = 198pt (delta = 198 - 80 = 118, bottom = 248)
    // itemsB: 15 data rows + header = 18 + 15 * 18 = 288pt (delta = 288 - 80 = 208, bottom = 338)
    const data: InputJSON = {
      texts: {},
      tables: {
        itemsA: Array.from({ length: 10 }, (_, i) => ({ col1: `A${i}` })),
        itemsB: Array.from({ length: 15 }, (_, i) => ({ col1: `B${i}` })),
      },
      images: {},
    }

    const baseWidth = 600
    const baseHeight = 500

    const result = adjustPageLayout(
      [tableA, tableB, asideText, belowText],
      data,
      baseWidth,
      baseHeight,
    )

    const resA = result.fields.find((f) => f.id === 'tableA')!
    const resB = result.fields.find((f) => f.id === 'tableB')!
    const resAside = result.fields.find((f) => f.id === 'aside')!
    const resBelow = result.fields.find((f) => f.id === 'below')!

    // Both tables must expand to their needed height (no more, no less)
    expect(resA.height).toBe(198)
    expect(resB.height).toBe(288)

    // Beside element stays at its original top position
    expect(resAside.y).toBe(60)

    // Maximum bottom of the two side-by-side tables is 50 + 288 = 338 (tableB is longer).
    // Original bottom was 130. Maximum delta is 338 - 130 = +208.
    // belowText was at 150 (20pt below 130) -> must now be at 338 + 20 = 358 (shifted by 208, NOT 118+208=326).
    expect(resBelow.y).toBe(358)

    // Total page height expands by max delta (208), so 500 + 208 = 708 (NOT 500 + 326 = 826).
    expect(result.height).toBe(708)
  })
})
