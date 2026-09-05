import { describe, it, expect } from 'vitest'
import type { TextField, ImageField } from '@template-goblin/types'
import { resolveUiField } from '../conditionalStyle.js'

describe('resolveUiField canvas & playground resolution', () => {
  const baseField: TextField = {
    id: 'txt-1',
    type: 'text',
    groupId: null,
    pageId: null,
    label: 'Status',
    x: 10,
    y: 10,
    width: 100,
    height: 30,
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
    conditionalStyles: {
      enabled: true,
      activeConditionId: 'c2',
      conditions: [
        {
          id: 'c1',
          name: 'condition-1',
          isDefault: true,
          style: { color: '#ff0000', fontSize: 16 },
        },
        {
          id: 'c2',
          name: 'condition-2',
          isDefault: false,
          style: { color: '#00ff00', fontSize: 24 },
        },
        {
          id: 'c3',
          name: 'condition-3',
          isDefault: false,
          style: { color: '#0000ff', fontSize: 32 },
        },
      ],
    },
  }

  it('prioritizes activeConditionId selected by user in playground over default', () => {
    // Even without data or with default marked as c1, activeConditionId c2 must be reflected
    const resolved = resolveUiField(baseField)
    expect(resolved.style.color).toBe('#00ff00')
    expect(resolved.style.fontSize).toBe(24)
  })

  it('reflects when user switches to a different condition', () => {
    const switchedField: TextField = {
      ...baseField,
      conditionalStyles: {
        ...baseField.conditionalStyles!,
        activeConditionId: 'c3',
      },
    }
    const resolved = resolveUiField(switchedField)
    expect(resolved.style.color).toBe('#0000ff')
    expect(resolved.style.fontSize).toBe(32)
  })

  it('falls back to default condition when activeConditionId is undefined', () => {
    const fieldWithoutActive: TextField = {
      ...baseField,
      conditionalStyles: {
        ...baseField.conditionalStyles!,
        activeConditionId: undefined,
      },
    }
    const resolved = resolveUiField(fieldWithoutActive)
    expect(resolved.style.color).toBe('#ff0000')
    expect(resolved.style.fontSize).toBe(16)
  })

  it('falls back to base field if conditional styling is disabled', () => {
    const disabledField: TextField = {
      ...baseField,
      conditionalStyles: {
        ...baseField.conditionalStyles!,
        enabled: false,
      },
    }
    const resolved = resolveUiField(disabledField)
    expect(resolved.style.color).toBe('#000000')
    expect(resolved.style.fontSize).toBe(12)
  })

  it('preserves user selected condition when default condition changes', () => {
    // Changing default from c1 to c3 should still render user-selected c2
    const defaultChangedField: TextField = {
      ...baseField,
      conditionalStyles: {
        ...baseField.conditionalStyles!,
        activeConditionId: 'c2',
        conditions: [
          {
            id: 'c1',
            name: 'condition-1',
            isDefault: false,
            style: { color: '#ff0000', fontSize: 16 },
          },
          {
            id: 'c2',
            name: 'condition-2',
            isDefault: false,
            style: { color: '#00ff00', fontSize: 24 },
          },
          {
            id: 'c3',
            name: 'condition-3',
            isDefault: true,
            style: { color: '#0000ff', fontSize: 32 },
          },
        ],
      },
    }
    const resolved = resolveUiField(defaultChangedField)
    expect(resolved.style.color).toBe('#00ff00')
    expect(resolved.style.fontSize).toBe(24)
  })

  it('resolves effective rotation, groupId, and hyperlink overrides', () => {
    const fieldWithExtras: TextField = {
      ...baseField,
      groupId: null,
      rotation: 0,
      hyperlink: undefined,
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c-extra',
        conditions: [
          {
            id: 'c-extra',
            name: 'extra',
            isDefault: false,
            style: {
              rotation: 45,
              groupId: 'grp-test',
              hyperlink: { mode: 'static', url: 'https://goblin.dev' },
            },
          },
        ],
      },
    }
    const resolved = resolveUiField(fieldWithExtras)
    expect(resolved.rotation).toBe(45)
    expect(resolved.groupId).toBe('grp-test')
    expect(resolved.hyperlink).toEqual({ mode: 'static', url: 'https://goblin.dev' })
  })

  it('resolves image solid color fill and filename overrides in UI', () => {
    const imgField: ImageField = {
      id: 'img-1',
      type: 'image',
      groupId: null,
      pageId: null,
      label: 'Photo',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      zIndex: 0,
      style: { fit: 'contain' },
      source: { mode: 'dynamic', jsonKey: 'pic', required: false, placeholder: null },
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c-color',
        conditions: [
          {
            id: 'c-color',
            name: 'color_override',
            isDefault: false,
            style: { color: '#00ffff', fit: 'cover' },
          },
        ],
      },
    }
    const resolvedColor = resolveUiField(imgField)
    expect(resolvedColor.style.fit).toBe('cover')
    expect(resolvedColor.source).toEqual({ mode: 'static', value: { color: '#00ffff' } })

    const imgWithFilename: ImageField = {
      ...imgField,
      conditionalStyles: {
        ...imgField.conditionalStyles!,
        activeConditionId: 'c-file',
        conditions: [
          {
            id: 'c-file',
            name: 'file_override',
            isDefault: false,
            style: { filename: 'avatar.png' },
          },
        ],
      },
    }
    const resolvedFile = resolveUiField(imgWithFilename)
    expect(resolvedFile.source).toEqual({ mode: 'static', value: { filename: 'avatar.png' } })
  })
})
