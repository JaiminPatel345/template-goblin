import { describe, it, expect } from 'vitest'
import type { TextField, TableField } from '@template-goblin/types'
import { ConditionStylingInfoTip } from '../ConditionStylingInfoTip.js'

describe('ConditionStylingInfoTip', () => {
  it('exports ConditionStylingInfoTip component function', () => {
    expect(typeof ConditionStylingInfoTip).toBe('function')
  })

  it('renders correctly for dynamic field with custom jsonKey', () => {
    const dynamicField: TextField = {
      id: 'f-text-1',
      type: 'text',
      label: 'Status',
      groupId: null,
      pageId: null,
      x: 10,
      y: 10,
      width: 100,
      height: 30,
      zIndex: 0,
      source: { mode: 'dynamic', jsonKey: 'invoice_status', required: false, placeholder: '' },
      style: {
        fontId: null,
        fontFamily: 'Helvetica',
        fontSize: 12,
        fontSizeMin: 8,
        lineHeight: 1.2,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        align: 'left',
        verticalAlign: 'top',
        maxRows: 1,
        overflowMode: 'truncate',
        snapToGrid: false,
      },
    }

    const element = ConditionStylingInfoTip({ field: dynamicField })
    expect(element).toBeDefined()
    expect(element.props.title).toBe('Condition-Based Styling')
    expect(element.props.placement).toBe('bottom')
    expect(element.props.align).toBe('left')
  })

  it('renders correctly for static table field using field.id as fallback', () => {
    const tableField = {
      id: 'tbl-items',
      type: 'table',
      label: 'Items',
      groupId: null,
      pageId: null,
      x: 20,
      y: 50,
      width: 400,
      height: 200,
      zIndex: 0,
      source: { mode: 'static', value: [] },
      columns: [],
      rows: [],
      style: {} as TableField['style'],
    } as unknown as TableField

    const element = ConditionStylingInfoTip({ field: tableField })
    expect(element).toBeDefined()
    expect(element.props.dataTestId).toBe('conditional-styling-info-btn')
  })
})
