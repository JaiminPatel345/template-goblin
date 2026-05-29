/**
 * #172 — store-level coverage for `field.rotation`.
 *
 * The schema accepts `number | null | undefined`; this pins:
 *   - updateField persists a non-zero rotation
 *   - updateField with null clears the rotation back to the sparse default
 *   - omitting rotation entirely (legacy field shape) does not crash any
 *     selector and reads back as undefined
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { TextField, TextFieldStyle } from '@template-goblin/types'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

import { useTemplateStore } from '../templateStore'

function makeTextStyle(): TextFieldStyle {
  return {
    fontId: null,
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontSizeMin: 11,
    lineHeight: 1.2,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000',
    align: 'left',
    verticalAlign: 'top',
    maxRows: 1,
    overflowMode: 'truncate',
    snapToGrid: true,
  }
}

function makeField(overrides: Partial<TextField> = {}): TextField {
  return {
    id: 'f-1',
    type: 'text',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'static', value: 'hi' },
    x: 10,
    y: 20,
    width: 100,
    height: 30,
    zIndex: 0,
    style: makeTextStyle(),
    ...overrides,
  }
}

describe('templateStore — field.rotation (#172)', () => {
  beforeEach(() => {
    storage.clear()
    useTemplateStore.getState().reset()
  })

  it('updateField writes a non-zero rotation', () => {
    const s = useTemplateStore.getState()
    s.addField(makeField())
    s.updateField('f-1', { rotation: 45 })
    expect(useTemplateStore.getState().fields[0]?.rotation).toBe(45)
  })

  it('updateField with null clears rotation to the sparse default', () => {
    const s = useTemplateStore.getState()
    s.addField(makeField({ rotation: 90 }))
    s.updateField('f-1', { rotation: null })
    expect(useTemplateStore.getState().fields[0]?.rotation).toBeNull()
  })

  it('newly added field with no rotation reads as undefined (sparse default)', () => {
    const s = useTemplateStore.getState()
    s.addField(makeField())
    expect(useTemplateStore.getState().fields[0]?.rotation).toBeUndefined()
  })

  it('negative rotation passes through (Fabric angle is unbounded)', () => {
    const s = useTemplateStore.getState()
    s.addField(makeField())
    s.updateField('f-1', { rotation: -135 })
    expect(useTemplateStore.getState().fields[0]?.rotation).toBe(-135)
  })

  it('rotation > 360 passes through unchanged (no clamp on write)', () => {
    const s = useTemplateStore.getState()
    s.addField(makeField())
    s.updateField('f-1', { rotation: 720 })
    expect(useTemplateStore.getState().fields[0]?.rotation).toBe(720)
  })
})
