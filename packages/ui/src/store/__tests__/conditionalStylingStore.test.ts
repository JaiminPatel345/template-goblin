import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '../templateStore.js'
import type { TextField, TextFieldStyle } from '@template-goblin/types'

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

  it('updates condition rules and style overrides', () => {
    const textF: TextField = {
      id: 'field-2',
      type: 'text',
      groupId: null,
      pageId: null,
      label: 'Text 2',
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
      source: { mode: 'static', value: 'World' },
    }

    useTemplateStore.getState().addField(textF)

    const initialRules = [
      { id: 'c1', name: 'condition-1', isDefault: true, style: { fontSize: 14 } },
    ]

    useTemplateStore.getState().updateField('field-2', {
      conditionalStyles: {
        enabled: true,
        conditions: initialRules,
      },
    })

    const fieldBefore = useTemplateStore.getState().fields.find((f) => f.id === 'field-2')
    const condStyle = fieldBefore?.conditionalStyles?.conditions[0]
      ?.style as Partial<TextFieldStyle>
    expect(condStyle?.fontSize).toBe(14)
  })
})
