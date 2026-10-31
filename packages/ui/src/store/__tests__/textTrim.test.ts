import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '../templateStore.js'
import { defaultTextStyle } from '../../utils/defaults.js'
import type { TextField } from '@template-goblin/types'

describe('Text field trim whitespace option (issue #20)', () => {
  beforeEach(() => {
    useTemplateStore.setState({
      fields: [],
    })
  })

  it('defaultTextStyle includes trim: true', () => {
    const style = defaultTextStyle()
    expect(style.trim).toBe(true)
  })

  it('updateFieldStyle toggles trim between true and false', () => {
    const field: TextField = {
      id: 'tf-1',
      type: 'text',
      groupId: null,
      pageId: null,
      label: 'Test Text',
      source: { mode: 'static', value: '  Hello  ' },
      x: 10,
      y: 10,
      width: 100,
      height: 30,
      zIndex: 0,
      style: defaultTextStyle(),
    }
    useTemplateStore.setState({ fields: [field] })

    // Default trim is true
    const current = useTemplateStore.getState().fields[0] as TextField
    expect(current.style.trim).toBe(true)

    // Uncheck trim -> false
    useTemplateStore.getState().updateFieldStyle('tf-1', { trim: false })
    const updated1 = useTemplateStore.getState().fields[0] as TextField
    expect(updated1.style.trim).toBe(false)

    // Re-check trim -> true
    useTemplateStore.getState().updateFieldStyle('tf-1', { trim: true })
    const updated2 = useTemplateStore.getState().fields[0] as TextField
    expect(updated2.style.trim).toBe(true)
  })

  it('resolveTextStyle correctly reflects trim state for canvas rendering', async () => {
    const { resolveTextStyle } = await import('../../components/Canvas/textMeasure.js')

    const fieldTrimTrue: TextField = {
      id: 'tf-1',
      type: 'text',
      groupId: null,
      pageId: null,
      label: 'Test',
      source: { mode: 'static', value: '   Hello   ' },
      x: 0,
      y: 0,
      width: 100,
      height: 30,
      zIndex: 0,
      style: { ...defaultTextStyle(), trim: true },
    }
    expect(resolveTextStyle(fieldTrimTrue).trim).toBe(true)

    const fieldTrimFalse: TextField = {
      ...fieldTrimTrue,
      style: { ...defaultTextStyle(), trim: false },
    }
    expect(resolveTextStyle(fieldTrimFalse).trim).toBe(false)
  })
})
