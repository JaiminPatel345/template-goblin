import { describe, it, expect, beforeEach, vi } from 'vitest'

// Stub localStorage before importing the store (persist middleware needs it at module load)
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

import { useTemplateStore } from '../templateStore'
import type {
  FieldDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  LoopFieldStyle,
  GroupDefinition,
  FontDefinition,
  TemplateMeta,
} from '@template-goblin/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTextStyle(overrides: Partial<TextFieldStyle> = {}): TextFieldStyle {
  return {
    fontId: null,
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontSizeDynamic: false,
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
    ...overrides,
  }
}

function makeTextField(overrides: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    id: '',
    type: 'text',
    groupId: null,
    pageId: null,
    required: false,
    jsonKey: 'texts.test',
    placeholder: null,
    x: 0,
    y: 0,
    width: 100,
    height: 30,
    zIndex: 0,
    style: makeTextStyle(),
    ...overrides,
  }
}

function makeImageField(overrides: Partial<FieldDefinition> = {}): FieldDefinition {
  const imageStyle: ImageFieldStyle = {
    fit: 'contain',
    placeholderFilename: null,
  }
  return {
    id: '',
    type: 'image',
    groupId: null,
    pageId: null,
    required: false,
    jsonKey: 'images.logo',
    placeholder: null,
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    zIndex: 0,
    style: imageStyle,
    ...overrides,
  }
}

function makeLoopField(overrides: Partial<FieldDefinition> = {}): FieldDefinition {
  const loopStyle: LoopFieldStyle = {
    maxRows: 10,
    maxColumns: 3,
    multiPage: false,
    headerStyle: {
      fontFamily: 'Helvetica',
      fontSize: 12,
      fontWeight: 'bold',
      align: 'left',
      color: '#000',
      backgroundColor: '#eee',
    },
    rowStyle: {
      fontFamily: 'Helvetica',
      fontSize: 11,
      fontWeight: 'normal',
      color: '#333',
      overflowMode: 'truncate',
      fontSizeDynamic: false,
      fontSizeMin: 8,
      lineHeight: 1.2,
    },
    cellStyle: {
      borderWidth: 1,
      borderColor: '#ccc',
      paddingTop: 2,
      paddingBottom: 2,
      paddingLeft: 4,
      paddingRight: 4,
    },
    columns: [{ key: 'col1', label: 'Column 1', width: 100, align: 'left' }],
  }
  return {
    id: '',
    type: 'loop',
    groupId: null,
    pageId: null,
    required: false,
    jsonKey: 'tables.items',
    placeholder: null,
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    zIndex: 0,
    style: loopStyle,
    ...overrides,
  }
}

function makeGroup(overrides: Partial<GroupDefinition> = {}): GroupDefinition {
  return {
    id: 'group-1',
    name: 'Test Group',
    ...overrides,
  }
}

function makeFont(overrides: Partial<FontDefinition> = {}): FontDefinition {
  return {
    id: 'font-1',
    name: 'CustomFont',
    filename: 'CustomFont.ttf',
    ...overrides,
  }
}

/** Shorthand to get current store state */
function state() {
  return useTemplateStore.getState()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

// ----------------------------- addField ------------------------------------

describe('addField', () => {
  it('adds a text field and grows the fields array', () => {
    expect(state().fields).toHaveLength(0)
    state().addField(makeTextField({ id: 'txt-1' }))
    expect(state().fields).toHaveLength(1)
    expect(state().fields[0]?.type).toBe('text')
    expect(state().fields[0]?.id).toBe('txt-1')
  })

  it('adds an image field', () => {
    state().addField(makeImageField({ id: 'img-1' }))
    expect(state().fields).toHaveLength(1)
    expect(state().fields[0]?.type).toBe('image')
    expect(state().fields[0]?.id).toBe('img-1')
  })

  it('adds a loop field', () => {
    state().addField(makeLoopField({ id: 'loop-1' }))
    expect(state().fields).toHaveLength(1)
    expect(state().fields[0]?.type).toBe('loop')
    expect(state().fields[0]?.id).toBe('loop-1')
  })

  it('auto-generates an id when the provided id is empty', () => {
    state().addField(makeTextField({ id: '' }))
    const field = state().fields[0]
    expect(field).toBeDefined()
    expect(field!.id).not.toBe('')
    expect(field!.id.startsWith('field-')).toBe(true)
  })

  it('sets the zIndex supplied by the caller', () => {
    state().addField(makeTextField({ id: 'z-field', zIndex: 5 }))
    expect(state().fields[0]?.zIndex).toBe(5)
  })

  it('preserves all style properties on the added field', () => {
    const style = makeTextStyle({ fontSize: 24, color: '#ff0000' })
    state().addField(makeTextField({ id: 'styled', style }))
    const s = state().fields[0]?.style as TextFieldStyle
    expect(s.fontSize).toBe(24)
    expect(s.color).toBe('#ff0000')
  })
})

// ----------------------------- updateField ---------------------------------

describe('updateField', () => {
  it('updates the jsonKey of an existing field', () => {
    state().addField(makeTextField({ id: 'u1' }))
    state().updateField('u1', { jsonKey: 'texts.updated' })
    expect(state().fields[0]?.jsonKey).toBe('texts.updated')
  })

  it('updates the position (x, y)', () => {
    state().addField(makeTextField({ id: 'u2', x: 0, y: 0 }))
    state().updateField('u2', { x: 50, y: 75 })
    const f = state().fields[0]
    expect(f?.x).toBe(50)
    expect(f?.y).toBe(75)
  })

  it('updates the required flag', () => {
    state().addField(makeTextField({ id: 'u3', required: false }))
    state().updateField('u3', { required: true })
    expect(state().fields[0]?.required).toBe(true)
  })

  it('does not affect other fields when updating one', () => {
    state().addField(makeTextField({ id: 'a', jsonKey: 'texts.a' }))
    state().addField(makeTextField({ id: 'b', jsonKey: 'texts.b' }))
    state().updateField('a', { jsonKey: 'texts.a2' })
    expect(state().fields.find((f) => f.id === 'b')?.jsonKey).toBe('texts.b')
  })
})

// ----------------------------- updateFieldStyle ----------------------------

describe('updateFieldStyle', () => {
  it('updates fontSize on a text field style', () => {
    state().addField(makeTextField({ id: 'fs1' }))
    state().updateFieldStyle('fs1', { fontSize: 20 })
    const s = state().fields[0]?.style as TextFieldStyle
    expect(s.fontSize).toBe(20)
  })

  it('updates color', () => {
    state().addField(makeTextField({ id: 'fs2' }))
    state().updateFieldStyle('fs2', { color: '#abcdef' })
    const s = state().fields[0]?.style as TextFieldStyle
    expect(s.color).toBe('#abcdef')
  })

  it('updates multiple style props at once', () => {
    state().addField(makeTextField({ id: 'fs3' }))
    state().updateFieldStyle('fs3', {
      fontSize: 18,
      fontWeight: 'bold',
      align: 'center',
    })
    const s = state().fields[0]?.style as TextFieldStyle
    expect(s.fontSize).toBe(18)
    expect(s.fontWeight).toBe('bold')
    expect(s.align).toBe('center')
  })

  it('preserves style props that were not updated', () => {
    state().addField(makeTextField({ id: 'fs4' }))
    state().updateFieldStyle('fs4', { fontSize: 30 })
    const s = state().fields[0]?.style as TextFieldStyle
    expect(s.fontFamily).toBe('Helvetica')
    expect(s.color).toBe('#000')
    expect(s.lineHeight).toBe(1.2)
  })
})

// -------------------- removeField / removeFields ---------------------------

describe('removeField / removeFields', () => {
  it('removes a single field by id', () => {
    state().addField(makeTextField({ id: 'r1' }))
    state().addField(makeTextField({ id: 'r2' }))
    state().removeField('r1')
    expect(state().fields).toHaveLength(1)
    expect(state().fields[0]?.id).toBe('r2')
  })

  it('removes multiple fields at once', () => {
    state().addField(makeTextField({ id: 'rm1' }))
    state().addField(makeTextField({ id: 'rm2' }))
    state().addField(makeTextField({ id: 'rm3' }))
    state().removeFields(['rm1', 'rm3'])
    expect(state().fields).toHaveLength(1)
    expect(state().fields[0]?.id).toBe('rm2')
  })

  it('does not throw when removing a non-existent field', () => {
    state().addField(makeTextField({ id: 'keep' }))
    expect(() => state().removeField('does-not-exist')).not.toThrow()
    expect(state().fields).toHaveLength(1)
  })

  it('handles removeFields with an empty id array gracefully', () => {
    state().addField(makeTextField({ id: 'still-here' }))
    state().removeFields([])
    expect(state().fields).toHaveLength(1)
  })
})

// ----------------------------- duplicateField ------------------------------

describe('duplicateField', () => {
  it('creates a copy with a new id and offset position', () => {
    state().addField(makeTextField({ id: 'dup-src', x: 10, y: 20 }))
    const dup = state().duplicateField('dup-src')
    expect(dup).not.toBeNull()
    expect(dup!.id).not.toBe('dup-src')
    expect(dup!.x).toBe(30) // 10 + 20
    expect(dup!.y).toBe(40) // 20 + 20
    expect(state().fields).toHaveLength(2)
  })

  it('returns null for a non-existent field', () => {
    const result = state().duplicateField('ghost')
    expect(result).toBeNull()
    expect(state().fields).toHaveLength(0)
  })

  it('preserves the original field properties on the duplicate', () => {
    state().addField(
      makeTextField({
        id: 'dup2',
        jsonKey: 'texts.special',
        required: true,
        width: 250,
        height: 50,
      }),
    )
    const dup = state().duplicateField('dup2')
    expect(dup!.jsonKey).toBe('texts.special')
    expect(dup!.required).toBe(true)
    expect(dup!.width).toBe(250)
    expect(dup!.height).toBe(50)
  })
})

// ---------------------- moveField / resizeField ----------------------------

describe('moveField / resizeField', () => {
  it('moveField changes x and y', () => {
    state().addField(makeTextField({ id: 'mv1', x: 0, y: 0 }))
    state().moveField('mv1', 100, 200)
    const f = state().fields[0]
    expect(f?.x).toBe(100)
    expect(f?.y).toBe(200)
  })

  it('resizeField changes width and height', () => {
    state().addField(makeTextField({ id: 'rs1', width: 100, height: 30 }))
    state().resizeField('rs1', 300, 150)
    const f = state().fields[0]
    expect(f?.width).toBe(300)
    expect(f?.height).toBe(150)
  })

  it('moveField preserves other field properties', () => {
    state().addField(makeTextField({ id: 'mv2', jsonKey: 'texts.keep', width: 100, height: 30 }))
    state().moveField('mv2', 50, 60)
    const f = state().fields[0]
    expect(f?.jsonKey).toBe('texts.keep')
    expect(f?.width).toBe(100)
    expect(f?.height).toBe(30)
  })

  it('resizeField preserves other field properties', () => {
    state().addField(makeTextField({ id: 'rs2', jsonKey: 'texts.keep', x: 10, y: 20 }))
    state().resizeField('rs2', 500, 400)
    const f = state().fields[0]
    expect(f?.jsonKey).toBe('texts.keep')
    expect(f?.x).toBe(10)
    expect(f?.y).toBe(20)
  })
})

// ----------------------------- Z-index ops ---------------------------------

describe('Z-index operations', () => {
  function addThreeFields() {
    state().addField(makeTextField({ id: 'z1', zIndex: 0 }))
    state().addField(makeTextField({ id: 'z2', zIndex: 1 }))
    state().addField(makeTextField({ id: 'z3', zIndex: 2 }))
  }

  it('bringForward swaps the field with the one above it', () => {
    addThreeFields()
    state().bringForward('z2') // z2 (1) should swap with z3 (2)
    const z2 = state().fields.find((f) => f.id === 'z2')
    const z3 = state().fields.find((f) => f.id === 'z3')
    expect(z2?.zIndex).toBe(2)
    // z3 gets decremented
    expect(z3?.zIndex).toBe(1)
  })

  it('sendBackward swaps the field with the one below it', () => {
    addThreeFields()
    state().sendBackward('z2') // z2 (1) should swap with z1 (0)
    const z1 = state().fields.find((f) => f.id === 'z1')
    const z2 = state().fields.find((f) => f.id === 'z2')
    expect(z2?.zIndex).toBe(0)
    expect(z1?.zIndex).toBe(1)
  })

  it('bringToFront gives the field the highest zIndex', () => {
    addThreeFields()
    state().bringToFront('z1')
    const z1 = state().fields.find((f) => f.id === 'z1')
    const maxZ = Math.max(...state().fields.map((f) => f.zIndex))
    expect(z1?.zIndex).toBe(maxZ)
    expect(z1?.zIndex).toBeGreaterThan(2)
  })

  it('sendToBack gives the field the lowest zIndex', () => {
    addThreeFields()
    state().sendToBack('z3')
    const z3 = state().fields.find((f) => f.id === 'z3')
    const minZ = Math.min(...state().fields.map((f) => f.zIndex))
    expect(z3?.zIndex).toBe(minZ)
    expect(z3?.zIndex).toBeLessThan(0)
  })

  it('bringForward on the topmost field is a no-op', () => {
    addThreeFields()
    state().bringForward('z3')
    expect(state().fields.find((f) => f.id === 'z3')?.zIndex).toBe(2)
  })

  it('sendBackward on the bottommost field is a no-op', () => {
    addThreeFields()
    state().sendBackward('z1')
    expect(state().fields.find((f) => f.id === 'z1')?.zIndex).toBe(0)
  })
})

// ----------------------------- Undo / Redo ---------------------------------

describe('Undo / Redo', () => {
  // Note: pushHistory captures a snapshot of the *new* state after each action.
  // After reset(), history = [] and historyIndex = -1.
  // The first action creates snapshot[0] (with the field already present).
  // There is no "empty state" snapshot, so undo from index 0 is a no-op.
  // Meaningful undo requires at least 2 history entries (2 actions).

  it('canUndo returns false initially (no history)', () => {
    expect(state().canUndo()).toBe(false)
  })

  it('canUndo returns false after a single action (only one snapshot exists)', () => {
    state().addField(makeTextField({ id: 'ur0' }))
    // historyIndex is 0, and undo checks historyIndex <= 0
    expect(state().canUndo()).toBe(false)
  })

  it('canRedo returns false when at the latest state', () => {
    state().addField(makeTextField({ id: 'ur1' }))
    expect(state().canRedo()).toBe(false)
  })

  it('after two addFields, undo reverts to the first snapshot', () => {
    state().addField(makeTextField({ id: 'ur2a' }))
    state().addField(makeTextField({ id: 'ur2b' }))
    expect(state().fields).toHaveLength(2)
    state().undo()
    // Reverts to snapshot[0] which has the first field
    expect(state().fields).toHaveLength(1)
    expect(state().fields[0]?.id).toBe('ur2a')
  })

  it('after undo, redo restores the later snapshot', () => {
    state().addField(makeTextField({ id: 'ur3a' }))
    state().addField(makeTextField({ id: 'ur3b' }))
    state().undo()
    expect(state().fields).toHaveLength(1)
    state().redo()
    expect(state().fields).toHaveLength(2)
    expect(state().fields[1]?.id).toBe('ur3b')
  })

  it('multiple undos walk back through history', () => {
    state().addField(makeTextField({ id: 'h1' }))
    state().addField(makeTextField({ id: 'h2' }))
    state().addField(makeTextField({ id: 'h3' }))
    expect(state().fields).toHaveLength(3)

    state().undo()
    expect(state().fields).toHaveLength(2)

    state().undo()
    expect(state().fields).toHaveLength(1)
    expect(state().fields[0]?.id).toBe('h1')
  })

  it('undo after undo then redo arrives at the correct intermediate state', () => {
    state().addField(makeTextField({ id: 'seq1' }))
    state().addField(makeTextField({ id: 'seq2' }))

    state().undo() // back to 1 field
    expect(state().fields).toHaveLength(1)

    state().redo() // forward to 2 fields
    expect(state().fields).toHaveLength(2)
  })

  it('canUndo becomes true after two actions, false after undoing to first snapshot', () => {
    expect(state().canUndo()).toBe(false)
    state().addField(makeTextField({ id: 'cu1' }))
    state().addField(makeTextField({ id: 'cu2' }))
    expect(state().canUndo()).toBe(true)
    state().undo()
    // Now at index 0, canUndo is false
    expect(state().canUndo()).toBe(false)
  })

  it('canRedo becomes true after undo, false after redo', () => {
    state().addField(makeTextField({ id: 'cr1' }))
    state().addField(makeTextField({ id: 'cr2' }))
    expect(state().canRedo()).toBe(false)
    state().undo()
    expect(state().canRedo()).toBe(true)
    state().redo()
    expect(state().canRedo()).toBe(false)
  })
})

// ----------------------------- Groups --------------------------------------

describe('Groups', () => {
  it('addGroup appends to the groups array', () => {
    state().addGroup(makeGroup({ id: 'g1', name: 'Header' }))
    expect(state().groups).toHaveLength(1)
    expect(state().groups[0]?.name).toBe('Header')
  })

  it('removeGroup removes the group and unsets groupId on associated fields', () => {
    state().addGroup(makeGroup({ id: 'g-del', name: 'ToDelete' }))
    state().addField(makeTextField({ id: 'fg1', groupId: 'g-del' }))
    state().addField(makeTextField({ id: 'fg2', groupId: 'g-del' }))
    state().addField(makeTextField({ id: 'fg3', groupId: null }))

    state().removeGroup('g-del')
    expect(state().groups).toHaveLength(0)
    expect(state().fields.find((f) => f.id === 'fg1')?.groupId).toBeNull()
    expect(state().fields.find((f) => f.id === 'fg2')?.groupId).toBeNull()
    expect(state().fields.find((f) => f.id === 'fg3')?.groupId).toBeNull()
  })

  it('updateGroup changes the group name', () => {
    state().addGroup(makeGroup({ id: 'g-upd', name: 'Old Name' }))
    state().updateGroup('g-upd', 'New Name')
    expect(state().groups[0]?.name).toBe('New Name')
  })

  it('addGroup does not affect existing groups', () => {
    state().addGroup(makeGroup({ id: 'ga', name: 'A' }))
    state().addGroup(makeGroup({ id: 'gb', name: 'B' }))
    expect(state().groups).toHaveLength(2)
    expect(state().groups[0]?.name).toBe('A')
    expect(state().groups[1]?.name).toBe('B')
  })
})

// ----------------------------- Fonts ---------------------------------------

describe('Fonts', () => {
  it('addFont adds to fonts array and fontBuffers map', () => {
    const font = makeFont({ id: 'f1' })
    const buffer = new ArrayBuffer(16)
    state().addFont(font, buffer)

    expect(state().fonts).toHaveLength(1)
    expect(state().fonts[0]?.id).toBe('f1')
    expect(state().fontBuffers.has('f1')).toBe(true)
    expect(state().fontBuffers.get('f1')).toBe(buffer)
  })

  it('removeFont removes from both fonts array and fontBuffers map', () => {
    const font = makeFont({ id: 'f2' })
    const buffer = new ArrayBuffer(8)
    state().addFont(font, buffer)
    expect(state().fonts).toHaveLength(1)

    state().removeFont('f2')
    expect(state().fonts).toHaveLength(0)
    expect(state().fontBuffers.has('f2')).toBe(false)
  })

  it('adding multiple fonts keeps them all', () => {
    state().addFont(makeFont({ id: 'fa', name: 'FontA', filename: 'a.ttf' }), new ArrayBuffer(4))
    state().addFont(makeFont({ id: 'fb', name: 'FontB', filename: 'b.ttf' }), new ArrayBuffer(4))
    expect(state().fonts).toHaveLength(2)
    expect(state().fontBuffers.size).toBe(2)
  })
})

// -------------------- setMeta / setPageSize / setLocked --------------------

describe('setMeta / setPageSize / setLocked', () => {
  it('setMeta updates template name and updatedAt', () => {
    vi.useFakeTimers()
    try {
      const before = state().meta.updatedAt
      vi.advanceTimersByTime(1000) // advance 1 second so updatedAt differs
      state().setMeta({ name: 'Invoice Template' })
      expect(state().meta.name).toBe('Invoice Template')
      expect(state().meta.updatedAt).not.toBe(before)
    } finally {
      vi.useRealTimers()
    }
  })

  it('setPageSize updates pageSize, width, and height', () => {
    state().setPageSize('Letter', 612, 792)
    expect(state().meta.pageSize).toBe('Letter')
    expect(state().meta.width).toBe(612)
    expect(state().meta.height).toBe(792)
  })

  it('setLocked updates the locked flag', () => {
    expect(state().meta.locked).toBe(false)
    state().setLocked(true)
    expect(state().meta.locked).toBe(true)
  })

  it('setMeta preserves fields not included in the partial update', () => {
    state().setMeta({ name: 'New Name' })
    // pageSize should still be the default
    expect(state().meta.pageSize).toBe('A4')
    expect(state().meta.unit).toBe('pt')
  })
})

// ----------------------------- reset ---------------------------------------

describe('reset', () => {
  it('clears all state back to defaults', () => {
    // Build up some state
    state().addField(makeTextField({ id: 'rf1' }))
    state().addField(makeImageField({ id: 'ri1' }))
    state().addGroup(makeGroup({ id: 'rg1' }))
    state().addFont(makeFont({ id: 'rfont1' }), new ArrayBuffer(8))
    state().setMeta({ name: 'Dirty Template' })
    state().setLocked(true)

    state().reset()

    expect(state().fields).toHaveLength(0)
    expect(state().fonts).toHaveLength(0)
    expect(state().groups).toHaveLength(0)
    expect(state().fontBuffers.size).toBe(0)
    expect(state().placeholderBuffers.size).toBe(0)
    expect(state().backgroundDataUrl).toBeNull()
    expect(state().backgroundBuffer).toBeNull()
    expect(state().meta.name).toBe('Untitled Template')
    expect(state().meta.locked).toBe(false)
    expect(state().history).toHaveLength(0)
    expect(state().historyIndex).toBe(-1)
  })
})

// ----------------------------- loadFromManifest ----------------------------

describe('loadFromManifest', () => {
  it('sets all state from loaded data and initializes history', () => {
    const meta: TemplateMeta = {
      name: 'Loaded Template',
      width: 612,
      height: 792,
      unit: 'pt',
      pageSize: 'Letter',
      locked: false,
      maxPages: 2,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-06-15T12:00:00.000Z',
    }
    const fields: FieldDefinition[] = [
      makeTextField({ id: 'lf1', jsonKey: 'texts.title' }),
      makeImageField({ id: 'li1', jsonKey: 'images.header' }),
    ]
    const fonts: FontDefinition[] = [makeFont({ id: 'lfont1' })]
    const groups: GroupDefinition[] = [makeGroup({ id: 'lg1', name: 'Loaded Group' })]
    const bgDataUrl = 'data:image/png;base64,abc'
    const bgBuffer = new ArrayBuffer(32)
    const fontBuffers = new Map<string, ArrayBuffer>([['lfont1', new ArrayBuffer(16)]])
    const placeholderBuffers = new Map<string, ArrayBuffer>([
      ['placeholder.png', new ArrayBuffer(8)],
    ])

    state().loadFromManifest(
      meta,
      fields,
      fonts,
      groups,
      bgDataUrl,
      bgBuffer,
      fontBuffers,
      placeholderBuffers,
    )

    expect(state().meta.name).toBe('Loaded Template')
    expect(state().meta.pageSize).toBe('Letter')
    expect(state().meta.maxPages).toBe(2)
    expect(state().fields).toHaveLength(2)
    expect(state().fields[0]?.id).toBe('lf1')
    expect(state().fields[1]?.id).toBe('li1')
    expect(state().fonts).toHaveLength(1)
    expect(state().groups).toHaveLength(1)
    expect(state().groups[0]?.name).toBe('Loaded Group')
    expect(state().backgroundDataUrl).toBe(bgDataUrl)
    expect(state().backgroundBuffer).toBe(bgBuffer)
    expect(state().fontBuffers.size).toBe(1)
    expect(state().placeholderBuffers.size).toBe(1)
    // History is initialized with one snapshot
    expect(state().history).toHaveLength(1)
    expect(state().historyIndex).toBe(0)
  })
})

// ----------------------- Additional edge cases -----------------------------

describe('setBackground', () => {
  it('sets backgroundDataUrl and backgroundBuffer', () => {
    const buf = new ArrayBuffer(64)
    state().setBackground('data:image/png;base64,xyz', buf)
    expect(state().backgroundDataUrl).toBe('data:image/png;base64,xyz')
    expect(state().backgroundBuffer).toBe(buf)
  })
})

describe('addPlaceholder', () => {
  it('adds an entry to placeholderBuffers', () => {
    const buf = new ArrayBuffer(32)
    state().addPlaceholder('img.png', buf)
    expect(state().placeholderBuffers.has('img.png')).toBe(true)
    expect(state().placeholderBuffers.get('img.png')).toBe(buf)
  })
})

describe('setFieldZIndex', () => {
  it('sets the zIndex of a specific field', () => {
    state().addField(makeTextField({ id: 'zi1', zIndex: 0 }))
    state().setFieldZIndex('zi1', 10)
    expect(state().fields[0]?.zIndex).toBe(10)
  })
})
