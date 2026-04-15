import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  FieldDefinition,
  TemplateMeta,
  FontDefinition,
  GroupDefinition,
  PageDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  LoopFieldStyle,
  PageSize,
} from '@template-goblin/types'

/** Snapshot of the template state for undo/redo */
interface HistorySnapshot {
  fields: FieldDefinition[]
  groups: GroupDefinition[]
}

export interface TemplateState {
  /** Template metadata */
  meta: TemplateMeta
  /** All fields on the canvas */
  fields: FieldDefinition[]
  /** Font definitions */
  fonts: FontDefinition[]
  /** Field groups */
  groups: GroupDefinition[]
  /** Pages in the template */
  pages: PageDefinition[]
  /** Background image as data URL for canvas display (legacy / page 0) */
  backgroundDataUrl: string | null
  /** Background image as raw bytes for saving (legacy / page 0) */
  backgroundBuffer: ArrayBuffer | null
  /** Per-page background data URLs for canvas display, keyed by page ID */
  pageBackgroundDataUrls: Map<string, string>
  /** Per-page background buffers for saving, keyed by page ID */
  pageBackgroundBuffers: Map<string, ArrayBuffer>
  /** Font buffers for saving */
  fontBuffers: Map<string, ArrayBuffer>
  /** Placeholder image buffers for saving */
  placeholderBuffers: Map<string, ArrayBuffer>

  /** Undo/redo history */
  history: HistorySnapshot[]
  historyIndex: number
  maxHistory: number

  /** Actions */
  setMeta: (meta: Partial<TemplateMeta>) => void
  setPageSize: (pageSize: PageSize, width: number, height: number) => void
  setBackground: (dataUrl: string, buffer: ArrayBuffer) => void
  setLocked: (locked: boolean) => void

  addField: (field: FieldDefinition) => void
  updateField: (id: string, updates: Partial<FieldDefinition>) => void
  updateFieldStyle: (
    id: string,
    updates: Partial<TextFieldStyle | ImageFieldStyle | LoopFieldStyle>,
  ) => void
  removeField: (id: string) => void
  removeFields: (ids: string[]) => void
  duplicateField: (id: string) => FieldDefinition | null
  moveField: (id: string, x: number, y: number) => void
  resizeField: (id: string, width: number, height: number) => void
  setFieldZIndex: (id: string, zIndex: number) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void

  addGroup: (group: GroupDefinition) => void
  removeGroup: (id: string) => void
  updateGroup: (id: string, name: string) => void

  addFont: (font: FontDefinition, buffer: ArrayBuffer) => void
  removeFont: (id: string) => void

  addPlaceholder: (filename: string, buffer: ArrayBuffer) => void

  /** Add a page to the template */
  addPage: (
    page: PageDefinition,
    backgroundDataUrl?: string,
    backgroundBuffer?: ArrayBuffer,
  ) => void
  /** Remove a page and reassign its fields to page 0 (null) */
  removePage: (pageId: string) => void
  /** Update page properties */
  updatePage: (pageId: string, updates: Partial<PageDefinition>) => void
  /** Set the background image for a specific page */
  setPageBackground: (pageId: string, dataUrl: string, buffer: ArrayBuffer) => void

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  /** Reset to empty state */
  reset: () => void
  /** Load state from a parsed template */
  loadFromManifest: (
    meta: TemplateMeta,
    fields: FieldDefinition[],
    fonts: FontDefinition[],
    groups: GroupDefinition[],
    backgroundDataUrl: string | null,
    backgroundBuffer: ArrayBuffer | null,
    fontBuffers: Map<string, ArrayBuffer>,
    placeholderBuffers: Map<string, ArrayBuffer>,
    pages?: PageDefinition[],
    pageBackgroundDataUrls?: Map<string, string>,
    pageBackgroundBuffers?: Map<string, ArrayBuffer>,
  ) => void
}

const defaultMeta: TemplateMeta = {
  name: 'Untitled Template',
  width: 595,
  height: 842,
  unit: 'pt',
  pageSize: 'A4',
  locked: false,
  maxPages: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function createSnapshot(state: {
  fields: FieldDefinition[]
  groups: GroupDefinition[]
}): HistorySnapshot {
  return {
    fields: structuredClone(state.fields),
    groups: structuredClone(state.groups),
  }
}

function pushHistory(state: TemplateState): Partial<TemplateState> {
  const snapshot = createSnapshot(state)
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  newHistory.push(snapshot)

  // Trim to max history
  if (newHistory.length > state.maxHistory) {
    newHistory.shift()
  }

  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
  }
}

let fieldCounter = 0

function generateId(): string {
  fieldCounter++
  return `field-${Date.now()}-${fieldCounter}`
}

/** Convert ArrayBuffer to base64 for JSON serialization */
function ab2b64(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    const b = bytes[i]
    if (b !== undefined) binary += String.fromCharCode(b)
  }
  return btoa(binary)
}

/** Convert base64 back to ArrayBuffer */
function b642ab(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

/** Serialized form of state for localStorage */
interface PersistedState {
  meta: TemplateMeta
  fields: FieldDefinition[]
  fonts: FontDefinition[]
  groups: GroupDefinition[]
  pages: PageDefinition[]
  backgroundDataUrl: string | null
  backgroundBuffer: string | null
  pageBackgroundDataUrls: [string, string][]
  pageBackgroundBuffers: [string, string][]
  fontBuffers: [string, string][]
  placeholderBuffers: [string, string][]
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      meta: { ...defaultMeta },
      fields: [],
      fonts: [],
      groups: [],
      pages: [],
      backgroundDataUrl: null,
      backgroundBuffer: null,
      pageBackgroundDataUrls: new Map(),
      pageBackgroundBuffers: new Map(),
      fontBuffers: new Map(),
      placeholderBuffers: new Map(),

      history: [],
      historyIndex: -1,
      maxHistory: 50,

      setMeta: (updates) =>
        set((state) => ({
          meta: { ...state.meta, ...updates, updatedAt: new Date().toISOString() },
        })),

      setPageSize: (pageSize, width, height) =>
        set((state) => ({
          meta: { ...state.meta, pageSize, width, height, updatedAt: new Date().toISOString() },
        })),

      setBackground: (dataUrl, buffer) =>
        set({ backgroundDataUrl: dataUrl, backgroundBuffer: buffer }),

      setLocked: (locked) =>
        set((state) => ({
          meta: { ...state.meta, locked, updatedAt: new Date().toISOString() },
        })),

      addField: (field) =>
        set((state) => {
          const newField = { ...field, id: field.id || generateId() }
          return {
            fields: [...state.fields, newField],
            ...pushHistory({ ...state, fields: [...state.fields, newField], groups: state.groups }),
          }
        }),

      updateField: (id, updates) =>
        set((state) => {
          const fields = state.fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
          return { fields, ...pushHistory({ ...state, fields, groups: state.groups }) }
        }),

      updateFieldStyle: (id, updates) =>
        set((state) => {
          const fields = state.fields.map((f) =>
            f.id === id ? { ...f, style: { ...f.style, ...updates } } : f,
          )
          return { fields, ...pushHistory({ ...state, fields, groups: state.groups }) }
        }),

      removeField: (id) =>
        set((state) => {
          const fields = state.fields.filter((f) => f.id !== id)
          return { fields, ...pushHistory({ ...state, fields, groups: state.groups }) }
        }),

      removeFields: (ids) =>
        set((state) => {
          const idSet = new Set(ids)
          const fields = state.fields.filter((f) => !idSet.has(f.id))
          return { fields, ...pushHistory({ ...state, fields, groups: state.groups }) }
        }),

      duplicateField: (id) => {
        const state = get()
        const field = state.fields.find((f) => f.id === id)
        if (!field) return null
        const newField: FieldDefinition = {
          ...structuredClone(field),
          id: generateId(),
          x: field.x + 20,
          y: field.y + 20,
        }
        set((s) => {
          const fields = [...s.fields, newField]
          return { fields, ...pushHistory({ ...s, fields, groups: s.groups }) }
        })
        return newField
      },

      moveField: (id, x, y) =>
        set((state) => {
          const fields = state.fields.map((f) => (f.id === id ? { ...f, x, y } : f))
          return { fields, ...pushHistory({ ...state, fields, groups: state.groups }) }
        }),

      resizeField: (id, width, height) =>
        set((state) => {
          const fields = state.fields.map((f) => (f.id === id ? { ...f, width, height } : f))
          return { fields, ...pushHistory({ ...state, fields, groups: state.groups }) }
        }),

      setFieldZIndex: (id, zIndex) =>
        set((state) => {
          const fields = state.fields.map((f) => (f.id === id ? { ...f, zIndex } : f))
          return { fields }
        }),

      bringForward: (id) =>
        set((state) => {
          const sorted = [...state.fields].sort((a, b) => a.zIndex - b.zIndex)
          const idx = sorted.findIndex((f) => f.id === id)
          if (idx < 0 || idx >= sorted.length - 1) return state
          const target = sorted[idx + 1]
          if (!target) return state
          const fields = state.fields.map((f) => {
            if (f.id === id) return { ...f, zIndex: target.zIndex }
            if (f.id === target.id) return { ...f, zIndex: f.zIndex - 1 }
            return f
          })
          return { fields }
        }),

      sendBackward: (id) =>
        set((state) => {
          const sorted = [...state.fields].sort((a, b) => a.zIndex - b.zIndex)
          const idx = sorted.findIndex((f) => f.id === id)
          if (idx <= 0) return state
          const target = sorted[idx - 1]
          if (!target) return state
          const fields = state.fields.map((f) => {
            if (f.id === id) return { ...f, zIndex: target.zIndex }
            if (f.id === target.id) return { ...f, zIndex: f.zIndex + 1 }
            return f
          })
          return { fields }
        }),

      bringToFront: (id) =>
        set((state) => {
          const maxZ = Math.max(...state.fields.map((f) => f.zIndex), 0)
          const fields = state.fields.map((f) => (f.id === id ? { ...f, zIndex: maxZ + 1 } : f))
          return { fields }
        }),

      sendToBack: (id) =>
        set((state) => {
          const minZ = Math.min(...state.fields.map((f) => f.zIndex), 0)
          const fields = state.fields.map((f) => (f.id === id ? { ...f, zIndex: minZ - 1 } : f))
          return { fields }
        }),

      addGroup: (group) =>
        set((state) => {
          const groups = [...state.groups, group]
          return { groups, ...pushHistory({ ...state, fields: state.fields, groups }) }
        }),

      removeGroup: (id) =>
        set((state) => {
          const groups = state.groups.filter((g) => g.id !== id)
          const fields = state.fields.map((f) => (f.groupId === id ? { ...f, groupId: null } : f))
          return { groups, fields, ...pushHistory({ ...state, fields, groups }) }
        }),

      updateGroup: (id, name) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, name } : g)),
        })),

      addFont: (font, buffer) =>
        set((state) => {
          const fontBuffers = new Map(state.fontBuffers)
          fontBuffers.set(font.id, buffer)
          return { fonts: [...state.fonts, font], fontBuffers }
        }),

      removeFont: (id) =>
        set((state) => {
          const fontBuffers = new Map(state.fontBuffers)
          fontBuffers.delete(id)
          return {
            fonts: state.fonts.filter((f) => f.id !== id),
            fontBuffers,
          }
        }),

      addPlaceholder: (filename, buffer) =>
        set((state) => {
          const placeholderBuffers = new Map(state.placeholderBuffers)
          placeholderBuffers.set(filename, buffer)
          return { placeholderBuffers }
        }),

      addPage: (page, bgDataUrl, bgBuffer) =>
        set((state) => {
          const pages = [...state.pages, page]
          const pageBackgroundDataUrls = new Map(state.pageBackgroundDataUrls)
          const pageBackgroundBuffers = new Map(state.pageBackgroundBuffers)
          if (bgDataUrl) pageBackgroundDataUrls.set(page.id, bgDataUrl)
          if (bgBuffer) pageBackgroundBuffers.set(page.id, bgBuffer)
          return { pages, pageBackgroundDataUrls, pageBackgroundBuffers }
        }),

      removePage: (pageId) =>
        set((state) => {
          const pages = state.pages.filter((p) => p.id !== pageId)
          // Reassign fields on this page to page 0 (null)
          const fields = state.fields.map((f) => (f.pageId === pageId ? { ...f, pageId: null } : f))
          const pageBackgroundDataUrls = new Map(state.pageBackgroundDataUrls)
          const pageBackgroundBuffers = new Map(state.pageBackgroundBuffers)
          pageBackgroundDataUrls.delete(pageId)
          pageBackgroundBuffers.delete(pageId)
          // Re-index remaining pages
          const reindexed = pages.map((p, i) => ({ ...p, index: i }))
          return {
            pages: reindexed,
            fields,
            pageBackgroundDataUrls,
            pageBackgroundBuffers,
            ...pushHistory({ ...state, fields, groups: state.groups }),
          }
        }),

      updatePage: (pageId, updates) =>
        set((state) => ({
          pages: state.pages.map((p) => (p.id === pageId ? { ...p, ...updates } : p)),
        })),

      setPageBackground: (pageId, dataUrl, buffer) =>
        set((state) => {
          const pageBackgroundDataUrls = new Map(state.pageBackgroundDataUrls)
          const pageBackgroundBuffers = new Map(state.pageBackgroundBuffers)
          pageBackgroundDataUrls.set(pageId, dataUrl)
          pageBackgroundBuffers.set(pageId, buffer)
          return { pageBackgroundDataUrls, pageBackgroundBuffers }
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex <= 0) return state
          const newIndex = state.historyIndex - 1
          const snapshot = state.history[newIndex]
          if (!snapshot) return state
          return {
            fields: structuredClone(snapshot.fields),
            groups: structuredClone(snapshot.groups),
            historyIndex: newIndex,
          }
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex >= state.history.length - 1) return state
          const newIndex = state.historyIndex + 1
          const snapshot = state.history[newIndex]
          if (!snapshot) return state
          return {
            fields: structuredClone(snapshot.fields),
            groups: structuredClone(snapshot.groups),
            historyIndex: newIndex,
          }
        }),

      canUndo: () => {
        const state = get()
        return state.historyIndex > 0
      },

      canRedo: () => {
        const state = get()
        return state.historyIndex < state.history.length - 1
      },

      reset: () =>
        set({
          meta: {
            ...defaultMeta,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          fields: [],
          fonts: [],
          groups: [],
          pages: [],
          backgroundDataUrl: null,
          backgroundBuffer: null,
          pageBackgroundDataUrls: new Map(),
          pageBackgroundBuffers: new Map(),
          fontBuffers: new Map(),
          placeholderBuffers: new Map(),
          history: [],
          historyIndex: -1,
        }),

      loadFromManifest: (
        meta,
        fields,
        fonts,
        groups,
        backgroundDataUrl,
        backgroundBuffer,
        fontBuffers,
        placeholderBuffers,
        pages,
        pageBackgroundDataUrls,
        pageBackgroundBuffers,
      ) =>
        set({
          meta,
          fields,
          fonts,
          groups,
          pages: pages ?? [],
          backgroundDataUrl,
          backgroundBuffer,
          pageBackgroundDataUrls: pageBackgroundDataUrls ?? new Map(),
          pageBackgroundBuffers: pageBackgroundBuffers ?? new Map(),
          fontBuffers,
          placeholderBuffers,
          history: [createSnapshot({ fields, groups })],
          historyIndex: 0,
        }),
    }),
    {
      name: 'template-goblin-template',
      version: 1,
      // Only persist essential data, skip history and transient state
      partialize: (state) => ({
        meta: state.meta,
        fields: state.fields,
        fonts: state.fonts,
        groups: state.groups,
        pages: state.pages,
        backgroundDataUrl: state.backgroundDataUrl,
        backgroundBuffer: state.backgroundBuffer,
        pageBackgroundDataUrls: state.pageBackgroundDataUrls,
        pageBackgroundBuffers: state.pageBackgroundBuffers,
        fontBuffers: state.fontBuffers,
        placeholderBuffers: state.placeholderBuffers,
      }),
      storage: {
        getItem: (name) => {
          const raw = localStorage.getItem(name)
          if (!raw) return null
          try {
            const parsed = JSON.parse(raw) as { state: PersistedState; version: number }
            const s = parsed.state
            return {
              ...parsed,
              state: {
                ...s,
                pages: s.pages ?? [],
                backgroundBuffer: s.backgroundBuffer ? b642ab(s.backgroundBuffer) : null,
                pageBackgroundDataUrls: new Map(
                  (s.pageBackgroundDataUrls ?? []).map(([k, v]) => [k, v]),
                ),
                pageBackgroundBuffers: new Map(
                  (s.pageBackgroundBuffers ?? []).map(([k, v]) => [k, b642ab(v)]),
                ),
                fontBuffers: new Map(s.fontBuffers.map(([k, v]) => [k, b642ab(v)])),
                placeholderBuffers: new Map(s.placeholderBuffers.map(([k, v]) => [k, b642ab(v)])),
              },
            }
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          const state = (value as { state: TemplateState }).state
          const serialized: PersistedState = {
            meta: state.meta,
            fields: state.fields,
            fonts: state.fonts,
            groups: state.groups,
            pages: state.pages,
            backgroundDataUrl: state.backgroundDataUrl,
            backgroundBuffer: state.backgroundBuffer ? ab2b64(state.backgroundBuffer) : null,
            pageBackgroundDataUrls: Array.from(state.pageBackgroundDataUrls.entries()),
            pageBackgroundBuffers: Array.from(state.pageBackgroundBuffers.entries()).map(
              ([k, v]) => [k, ab2b64(v)],
            ),
            fontBuffers: Array.from(state.fontBuffers.entries()).map(([k, v]) => [k, ab2b64(v)]),
            placeholderBuffers: Array.from(state.placeholderBuffers.entries()).map(([k, v]) => [
              k,
              ab2b64(v),
            ]),
          }
          localStorage.setItem(
            name,
            JSON.stringify({
              state: serialized,
              version: (value as { version?: number }).version ?? 1,
            }),
          )
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
