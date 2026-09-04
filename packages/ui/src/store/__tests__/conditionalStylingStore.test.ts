import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '../templateStore.js'
import type {
  FieldDefinition,
  TextField,
  ImageField,
  TableField,
  ImageFieldStyle,
  TableFieldStyle,
} from '@template-goblin/types'

describe('Conditional Styling UI Store Operations', () => {
  beforeEach(() => {
    useTemplateStore.getState().reset()
  })

  it('toggles conditional styling ON for a text field and initializes default rules', () => {
    const textF: TextField = {
      id: 'field-1',
      type: 'text',
      groupId: null,
      pageId: null,
      label: 'Text 1',
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      zIndex: 0,
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
      source: { mode: 'static', value: 'Hello' },
    }

    useTemplateStore.getState().addField(textF)

    useTemplateStore.getState().updateField('field-1', {
      conditionalStyles: {
        enabled: true,
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { color: '#ff0000' } },
          { id: 'c2', name: 'condition-2', isDefault: false, style: { color: '#00ff00' } },
        ],
      },
    })

    const updated = useTemplateStore.getState().fields.find((f) => f.id === 'field-1')
    expect(updated?.conditionalStyles?.enabled).toBe(true)
    expect(updated?.conditionalStyles?.conditions).toHaveLength(2)
    expect(updated?.conditionalStyles?.conditions[0]?.isDefault).toBe(true)
  })

  it('updates condition rules and style overrides for ImageField and TableField', () => {
    const imgF: ImageField = {
      id: 'img-1',
      type: 'image',
      groupId: null,
      pageId: null,
      label: 'Image 1',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      zIndex: 0,
      style: { fit: 'contain' },
      source: { mode: 'static', value: { color: '#ffffff' } },
    }

    const tableF: TableField = {
      id: 'tbl-1',
      type: 'table',
      groupId: null,
      pageId: null,
      label: 'Table 1',
      x: 10,
      y: 10,
      width: 300,
      height: 200,
      zIndex: 0,
      style: {
        maxRows: 10,
        maxColumns: 5,
        multiPage: false,
        showHeader: true,
        headerStyle: {
          fontFamily: 'Helvetica',
          fontSize: 10,
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#000000',
          backgroundColor: '#eeeeee',
          borderWidth: 1,
          borderColor: '#cccccc',
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: 4,
          paddingRight: 4,
          align: 'left',
          verticalAlign: 'middle',
        },
        rowStyle: {
          fontFamily: 'Helvetica',
          fontSize: 10,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#000000',
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#cccccc',
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: 4,
          paddingRight: 4,
          align: 'left',
          verticalAlign: 'middle',
        },
        oddRowStyle: null,
        evenRowStyle: null,
        cellStyle: { overflowMode: 'truncate' },
        columns: [],
      },
      source: { mode: 'static', value: [] },
    }

    useTemplateStore.getState().addField(imgF)
    useTemplateStore.getState().addField(tableF)

    useTemplateStore.getState().updateField('img-1', {
      conditionalStyles: {
        enabled: true,
        conditions: [{ id: 'c1', name: 'condition-1', isDefault: true, style: { fit: 'cover' } }],
      },
    })

    useTemplateStore.getState().updateField('tbl-1', {
      conditionalStyles: {
        enabled: true,
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { multiPage: true } },
        ],
      },
    })

    const updatedImg = useTemplateStore.getState().fields.find((f) => f.id === 'img-1')
    const imgStyle = updatedImg?.conditionalStyles?.conditions[0]?.style as Partial<ImageFieldStyle>
    expect(imgStyle?.fit).toBe('cover')

    const updatedTbl = useTemplateStore.getState().fields.find((f) => f.id === 'tbl-1')
    const tblStyle = updatedTbl?.conditionalStyles?.conditions[0]?.style as Partial<TableFieldStyle>
    expect(tblStyle?.multiPage).toBe(true)
  })

  it('supports toggling conditional styling OFF without losing stored rules', () => {
    const textF: TextField = {
      id: 'field-3',
      type: 'text',
      groupId: null,
      pageId: null,
      label: 'Text 3',
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      zIndex: 0,
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
      source: { mode: 'static', value: 'Test' },
    }

    useTemplateStore.getState().addField(textF)

    useTemplateStore.getState().updateField('field-3', {
      conditionalStyles: {
        enabled: true,
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { color: '#112233' } },
        ],
      },
    })

    // Turn OFF
    useTemplateStore.getState().updateField('field-3', {
      conditionalStyles: {
        enabled: false,
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { color: '#112233' } },
        ],
      },
    })

    const field = useTemplateStore.getState().fields.find((f) => f.id === 'field-3')
    expect(field?.conditionalStyles?.enabled).toBe(false)
    expect(field?.conditionalStyles?.conditions).toHaveLength(1)
  })

  it('updates active condition style overrides when activeConditionId is changed', () => {
    const textF: TextField = {
      id: 'field-4',
      type: 'text',
      groupId: null,
      pageId: null,
      label: 'Text 4',
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      zIndex: 0,
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
      source: { mode: 'static', value: 'Active Test' },
    }

    useTemplateStore.getState().addField(textF)

    useTemplateStore.getState().updateField('field-4', {
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c1',
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { color: '#ff0000' } },
          { id: 'c2', name: 'condition-2', isDefault: false, style: { color: '#0000ff' } },
        ],
      },
    })

    // Edit style while c1 is active
    useTemplateStore.getState().updateFieldStyle('field-4', { fontSize: 16 })
    let field = useTemplateStore.getState().fields.find((f) => f.id === 'field-4') as TextField
    expect(field.conditionalStyles?.conditions[0]?.style.fontSize).toBe(16)
    expect(field.conditionalStyles?.conditions[1]?.style.fontSize).toBeUndefined()

    // Switch active condition to c2
    useTemplateStore.getState().updateField('field-4', {
      conditionalStyles: {
        ...field.conditionalStyles!,
        activeConditionId: 'c2',
      },
    } as Partial<FieldDefinition>)

    // Edit style while c2 is active
    useTemplateStore.getState().updateFieldStyle('field-4', { fontSize: 24, color: '#00ff00' })
    field = useTemplateStore.getState().fields.find((f) => f.id === 'field-4') as TextField
    expect(field.conditionalStyles?.conditions[1]?.style.fontSize).toBe(24)
    expect(field.conditionalStyles?.conditions[1]?.style.color).toBe('#00ff00')
    // c1 style remains intact
    expect(field.conditionalStyles?.conditions[0]?.style.fontSize).toBe(16)
    expect(field.conditionalStyles?.conditions[0]?.style.color).toBe('#ff0000')
  })
})
