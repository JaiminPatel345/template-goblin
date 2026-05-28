import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { idbGet, idbSet, idbDelete, migrateFromLocalStorage } from './idbStorage.js'
import type {
  FieldDefinition,
  TemplateMeta,
  FontDefinition,
  GroupDefinition,
  PageDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
  PageSize,
  PageBand,
  PageBandStyle,
  PageNumberConfig,
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
  /**
   * Static image buffers (baked into `.tgbl` under `images/`). Keyed by bare
   * filename. Populated by the field-creation popup's image picker and by
   * loadTemplate on open.
   */
  staticImageBuffers: Map<string, ArrayBuffer>
  /** Data-URL mirror of staticImageBuffers for canvas preview. */
  staticImageDataUrls: Map<string, string>

  /** #61 — Optional page-wide header. */
  header?: PageBand
  /** #61 — Optional page-wide footer. */
  footer?: PageBand
  /** #61 — Optional page-number stamp configuration. */
  pageNumber?: PageNumberConfig

  /** Undo/redo history */
  history: HistorySnapshot[]
  historyIndex: number
  maxHistory: number
  /**
   * Reactive boolean derived from `historyIndex` / `history.length`
   * (#160). Components that need to disable an Undo / Redo button can
   * subscribe with `useTemplateStore((s) => s.canUndo)` and re-render
   * automatically on every history change — no method call needed.
   * The legacy method form is kept on the actions block below as
   * `canUndoFn` for backward compat with call-sites that already
   * shipped.
   */
  canUndo: boolean
  canRedo: boolean

  /** Actions */
  setMeta: (meta: Partial<TemplateMeta>) => void
  setPageSize: (pageSize: PageSize, width: number, height: number) => void
  setBackground: (dataUrl: string, buffer: ArrayBuffer) => void
  setLocked: (locked: boolean) => void

  addField: (field: FieldDefinition) => void
  updateField: (id: string, updates: Partial<FieldDefinition>) => void
  updateFieldStyle: (
    id: string,
    updates: Partial<TextFieldStyle | ImageFieldStyle | TableFieldStyle>,
  ) => void
  /**
   * Flip a field's source mode (GH #26). Preserves user content across the
   * flip:
   *  - static → dynamic: existing `source.value` becomes `placeholder`,
   *    a fresh `jsonKey` is generated, `required` defaults to false.
   *  - dynamic → static: existing `placeholder` becomes `source.value`
   *    when present; otherwise the type's empty default is used.
   */
  setFieldMode: (id: string, mode: 'static' | 'dynamic') => void
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

  /** #61 — Replace or clear the page-wide header. */
  setHeader: (header: PageBand | undefined) => void
  /**
   * #61 (follow-up) — show / hide the header while preserving its config.
   *  - Disabling migrates any band fields into `fields` with page-absolute
   *    coords so the user can keep editing them as normal body elements.
   *  - Enabling flips the visibility flag back on; the band's style /
   *    padding / divider come back exactly as the user left them.
   *  - Calling on a never-configured store creates the default band only
   *    when `enabled === true`.
   * Atomic: the body-fields append and the band-fields clear happen in one
   * `set` so the reconciler never sees the same id in both pools (the
   * "drag duplicates the element" symptom users reported).
   */
  setHeaderEnabled: (enabled: boolean) => void
  /** #61 — Patch the header's style (height / padding / divider / bg). */
  setHeaderStyle: (patch: Partial<PageBandStyle>) => void
  /** #61 — Add a band-local field to the header. */
  addHeaderField: (field: FieldDefinition) => void
  /** #61 — Update one of the header's band-local fields. */
  updateHeaderField: (id: string, updates: Partial<FieldDefinition>) => void
  /** #61 — Remove a band-local field from the header. */
  removeHeaderField: (id: string) => void
  /** #61 — Replace or clear the page-wide footer. */
  setFooter: (footer: PageBand | undefined) => void
  /** #61 (follow-up) — show / hide the footer; same semantics as
   *  `setHeaderEnabled`. */
  setFooterEnabled: (enabled: boolean) => void
  /** #61 — Patch the footer's style (height / padding / divider / bg). */
  setFooterStyle: (patch: Partial<PageBandStyle>) => void
  /** #61 — Add a band-local field to the footer. */
  addFooterField: (field: FieldDefinition) => void
  /** #61 — Update one of the footer's band-local fields. */
  updateFooterField: (id: string, updates: Partial<FieldDefinition>) => void
  /** #61 — Remove a band-local field from the footer. */
  removeFooterField: (id: string) => void
  /** #61 — Replace or clear the page-number config. */
  setPageNumber: (config: PageNumberConfig | undefined) => void
  /** #61 — Patch the page-number config (enabled / placement / etc.). */
  setPageNumberConfig: (patch: Partial<PageNumberConfig>) => void

  /**
   * Register a static image (baked into the template) for a static image
   * field. Stored under `images/<filename>` in the saved archive.
   */
  addStaticImage: (filename: string, dataUrl: string, buffer: ArrayBuffer) => void
  /** Remove a static image by its bare filename. */
  removeStaticImage: (filename: string) => void

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
  /**
   * Set the background of page 0 (the implicit/legacy first page) to a solid
   * color. Used by the onboarding picker when the user chooses "Solid color"
   * instead of uploading an image.
   *
   * Side effects:
   *  - Clears `backgroundDataUrl`/`backgroundBuffer` (they become meaningless).
   *  - Ensures a `PageDefinition` exists for page 0 with
   *    `backgroundType: 'color'` and the supplied hex.
   *  - Creates a default-sized page (A4 595x842 pt) if no meta dimensions were
   *    previously set from an image upload.
   */
  setPage0BackgroundColor: (
    hex: string,
    size?: { pageSize: PageSize; width: number; height: number },
  ) => void

  undo: () => void
  redo: () => void
  // canUndo / canRedo moved up to the state-field section (#160) so
  // components can subscribe with `useTemplateStore((s) => s.canUndo)`
  // and re-render reactively. No method form remains.

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
    staticImageBuffers?: Map<string, ArrayBuffer>,
    staticImageDataUrls?: Map<string, string>,
    // #61 — restored from `manifest.header` / `manifest.footer` /
    // `manifest.pageNumber`. All optional; legacy templates leave them
    // undefined and the editor behaves exactly as before.
    header?: PageBand,
    footer?: PageBand,
    pageNumber?: PageNumberConfig,
  ) => void
}

/**
 * Sanitise an externally-supplied page dimension. Keeps any positive finite
 * value untouched, otherwise floors at 1pt. Negative / zero / NaN / Infinity
 * page sizes would blank the canvas + crash the PDFKit renderer, so this is
 * the defence-in-depth clamp called from `setPageSize` and `updatePage`.
 */
function clampPageDimension(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 1
  return value
}

/**
 * Heal a persisted state blob in-place: clamp every page dimension at
 * read time so a pre-existing poisoned IDB entry (written before the
 * `setPageSize` / `updatePage` clamp landed) can't crash the canvas on
 * rehydrate. Closes the third gap from GH #113 — the first two were the
 * write-time clamp and the manifest validator, both already in. This is
 * the recovery path for users whose IDB still carries `width: -100` from
 * earlier testing.
 *
 * Mutates the passed object. Returns nothing — callers spread `s` after.
 */
function clampPersistedPageDimensions(s: {
  meta?: { width?: unknown; height?: unknown }
  pages?: Array<{ width?: unknown; height?: unknown }>
}): void {
  const heal = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 1 ? v : 1
  if (s.meta) {
    // meta.width/height are required `number` per the type, so anything
    // non-numeric here (null after JSON round-trip, missing) is also
    // corruption — coerce to 1 just like a negative would.
    s.meta.width = heal(s.meta.width)
    s.meta.height = heal(s.meta.height)
  }
  if (Array.isArray(s.pages)) {
    for (const p of s.pages) {
      // per-page width/height are optional (template-meta fallback applies
      // when undefined), so only touch them when they're explicitly set.
      if (p.width !== undefined) p.width = heal(p.width)
      if (p.height !== undefined) p.height = heal(p.height)
    }
  }
}

/**
 * Default `PageBand` config emitted the first time the user enables a
 * band from the toolbar menu (#61). Divider on by default — the user
 * specifically asked for this in the right-panel rebuild iteration. Height
 * differs between header (40pt) and footer (30pt) because footers tend
 * to be quieter (just a page number / line).
 */
/**
 * Keep `pageNumber` and its placement band consistent. Page numbers stamp
 * INSIDE the chosen band, so an enabled page-number with `placement: 'footer'`
 * needs an enabled footer band (and symmetrically for header) — otherwise
 * the core validator throws `PAGE_NUMBER_PLACEMENT_INVALID` at PDF time.
 * Returns the band patches the caller should merge with their own state
 * update so it all lands in one atomic `set()`.
 */
function ensureBandForPageNumber(
  state: { header?: PageBand; footer?: PageBand },
  config: { enabled?: boolean; placement?: 'header' | 'footer' } | undefined,
): { header?: PageBand; footer?: PageBand } {
  if (!config?.enabled) return {}
  const placement = config.placement
  if (placement !== 'header' && placement !== 'footer') return {}
  const current = placement === 'header' ? state.header : state.footer
  if (current?.enabled) return {}
  const next: PageBand = current ? { ...current, enabled: true } : defaultBand(placement)
  return placement === 'header' ? { header: next } : { footer: next }
}

function defaultBand(kind: 'header' | 'footer'): PageBand {
  return {
    enabled: true,
    style: {
      height: kind === 'header' ? 40 : 30,
      backgroundColor: null,
      // #61 follow-up — dividers default to DISABLED so a freshly-enabled
      // band is bare colour-fill, no line. Users can opt in via the
      // band-settings modal; when they do, the default `gap` is 0
      // (line sits flush against the band edge).
      divider: null,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 12,
      paddingRight: 12,
    },
    fields: [],
    applyToFirstPage: true,
  }
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

  const historyIndex = newHistory.length - 1
  return {
    history: newHistory,
    historyIndex,
    // #160 — reactive flags kept in sync with the index/length on
    // every history mutation so component subscribers re-render.
    canUndo: historyIndex > 0,
    canRedo: false,
  }
}

let fieldCounter = 0

/**
 * Module-scoped memo of each field's dynamic-side metadata (jsonKey +
 * required flag) the last time it was in dynamic mode. Persisted only
 * for the lifetime of the tab — the user's session-local round-trip
 * Dynamic → Static → Dynamic must restore the original jsonKey instead
 * of regenerating a fresh `text_N` (QA BUG-06).
 *
 * Not part of `PersistedState` on purpose; once the tab reloads the
 * fields' actual on-disk source is authoritative.
 */
let fieldDynamicMemo: Map<string, { jsonKey: string; required: boolean }> = new Map()

/**
 * Read-side accessor for the dynamic memo so UI surfaces (e.g. the
 * FIELDS list) can show the most recent dynamic-side label for a
 * field that has since been flipped to Static — instead of falling
 * back to a generic `<static text>` placeholder when the static
 * value is empty (QA BUG-11).
 */
export function getFieldDynamicMemo(
  id: string,
): { jsonKey: string; required: boolean } | undefined {
  return fieldDynamicMemo.get(id)
}

/**
 * Pick a `jsonKey` for a newly-flipped-to-dynamic field that doesn't collide
 * with any existing dynamic field's key (within the same type bucket — text,
 * image, table). Used by `setFieldMode` (GH #26).
 */
function generateDefaultJsonKey(
  type: FieldDefinition['type'],
  fields: FieldDefinition[],
  excludeId: string,
): string {
  const used = new Set<string>()
  for (const f of fields) {
    if (f.id === excludeId) continue
    if (f.type !== type) continue
    if (f.source?.mode === 'dynamic' && f.source.jsonKey) used.add(f.source.jsonKey)
  }
  const base = type === 'text' ? 'text' : type === 'image' ? 'image' : 'table'
  let n = 1
  while (used.has(`${base}_${n}`)) n++
  return `${base}_${n}`
}

/** Empty fallback value for a static field when no placeholder is available. */
function emptyStaticValue(type: FieldDefinition['type']): unknown {
  if (type === 'text') return ''
  if (type === 'image') return { filename: '' }
  return [] // table
}

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

/** Serialized form of state for localStorage.
 *
 * Image buffers (`backgroundBuffer`, `pageBackgroundBuffers`,
 * `staticImageBuffers`) are INTENTIONALLY NOT persisted — they're a
 * duplicate encoding of bytes already stored in the matching `*DataUrl(s)`
 * fields as base64 `data:` strings, and doubling them up used to blow
 * localStorage's ~5 MB quota on the first real photo (GH #11). On
 * rehydration we reconstruct the ArrayBuffers from the data URLs so the
 * save-to-.tgbl path still works. */
interface PersistedState {
  meta: TemplateMeta
  fields: FieldDefinition[]
  fonts: FontDefinition[]
  groups: GroupDefinition[]
  pages: PageDefinition[]
  backgroundDataUrl: string | null
  pageBackgroundDataUrls: [string, string][]
  fontBuffers: [string, string][]
  placeholderBuffers: [string, string][]
  staticImageDataUrls?: [string, string][]
  // #61 — page-wide header / footer / page-number config. Optional so
  // pre-#61 persisted entries restore cleanly with these undefined.
  header?: PageBand
  footer?: PageBand
  pageNumber?: PageNumberConfig
  // Legacy — still read on rehydration for backwards-compatibility with
  // entries written before #11 landed, but NOT written any more.
  backgroundBuffer?: string | null
  pageBackgroundBuffers?: [string, string][]
  staticImageBuffers?: [string, string][]
}

/**
 * Pull the base64 payload out of a `data:<mime>;base64,<payload>` URL and
 * decode it to an ArrayBuffer. Returns `null` if the URL is malformed or
 * not a data URL.
 */
function dataUrlToArrayBuffer(dataUrl: string | null | undefined): ArrayBuffer | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma < 0) return null
  try {
    return b642ab(dataUrl.slice(comma + 1))
  } catch {
    return null
  }
}

/** Persist schema version. Bumped to 2 in Phase 1 when `source: FieldSource<V>` replaced
 *  the legacy top-level `jsonKey`/`required`/`placeholder`/`style.placeholderFilename`
 *  fields. Version 1 entries in localStorage are transformed by `migratePersistedState`. */
const PERSIST_VERSION = 2

/**
 * Migrate a pre-Phase-1 persisted state (version 1 or unversioned) to the
 * current schema (version 2).
 *
 * Zustand's `migrate` hook operates on the state object returned by
 * `storage.getItem` — i.e. after our custom deserialization has already
 * converted `[k, v][]` tuples to `Map`s. The migration therefore only has to
 * touch `fields`; buffer/map shapes pass through untouched.
 *
 * Rules:
 * - Every field's legacy top-level `jsonKey`/`required`/`placeholder` is
 *   collapsed into `source = { mode: 'dynamic', jsonKey, required, placeholder }`.
 * - `type: 'loop'` is rewritten to `type: 'table'`.
 * - For image fields, `style.placeholderFilename` is moved to
 *   `source.placeholder = { filename }`.
 * - Fields with an already-corrupt `source` object are dropped with a warning.
 */
function migratePersistedState(persisted: unknown, fromVersion: number): Record<string, unknown> {
  const state = ((persisted as Record<string, unknown>) ?? {}) as Record<string, unknown>

  const rawFields = Array.isArray(state.fields) ? (state.fields as unknown[]) : []
  const migrated: unknown[] = []

  for (const raw of rawFields) {
    if (!raw || typeof raw !== 'object') continue
    const legacy = raw as Record<string, unknown> & { style?: Record<string, unknown> }

    // Rewrite legacy `type: 'loop'` to `table`.
    if (legacy.type === 'loop') {
      legacy.type = 'table'
    }

    // If the field already has a valid `source`, trust it.
    const existingSource = legacy.source
    if (existingSource && typeof existingSource === 'object') {
      const sourceObj = existingSource as Record<string, unknown>
      if (sourceObj.mode === 'static' || sourceObj.mode === 'dynamic') {
        migrated.push(legacy)
        continue
      }
      // Corrupt source — drop with a warning.

      console.warn('[templateStore] dropping field with corrupt source during migration:', legacy)
      continue
    }

    // Synthesize a dynamic source from the legacy top-level keys.
    const jsonKey = typeof legacy.jsonKey === 'string' ? legacy.jsonKey : ''
    const required = typeof legacy.required === 'boolean' ? legacy.required : true
    let placeholder: unknown = legacy.placeholder ?? null

    if (legacy.type === 'image') {
      const style = legacy.style as Record<string, unknown> | undefined
      const placeholderFilename = style?.placeholderFilename
      if (typeof placeholderFilename === 'string' && placeholderFilename.length > 0) {
        placeholder = { filename: placeholderFilename }
      }
      if (style && 'placeholderFilename' in style) {
        delete style.placeholderFilename
      }
    }

    legacy.source = { mode: 'dynamic', jsonKey, required, placeholder }

    delete legacy.jsonKey
    delete legacy.required
    delete legacy.placeholder

    migrated.push(legacy)
  }

  console.info(
    `[templateStore] migrated persisted state from v${fromVersion} to v${PERSIST_VERSION}`,
  )

  return { ...state, fields: migrated }
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
      staticImageBuffers: new Map(),
      staticImageDataUrls: new Map(),

      history: [],
      historyIndex: -1,
      maxHistory: 50,
      canUndo: false,
      canRedo: false,

      setMeta: (updates) =>
        set((state) => ({
          meta: { ...state.meta, ...updates, updatedAt: new Date().toISOString() },
        })),

      // Defence-in-depth clamp: the page-size UI inputs already enforce
      // `min="1"` at the HTML level, but a programmatic injection via the
      // dev console (or a stale persisted blob from a future bug) could
      // still land negative / zero / NaN values here, blanking the canvas
      // and crashing the renderer downstream. Pin width + height ≥ 1pt.
      setPageSize: (pageSize, width, height) =>
        set((state) => ({
          meta: {
            ...state.meta,
            pageSize,
            width: clampPageDimension(width),
            height: clampPageDimension(height),
            updatedAt: new Date().toISOString(),
          },
        })),

      setBackground: (dataUrl, buffer) =>
        set({ backgroundDataUrl: dataUrl, backgroundBuffer: buffer }),

      setLocked: (locked) =>
        set((state) => ({
          meta: { ...state.meta, locked, updatedAt: new Date().toISOString() },
        })),

      // ── #61: header / footer / page number ─────────────────────────────
      setHeader: (header) =>
        set((state) => ({
          header,
          meta: { ...state.meta, updatedAt: new Date().toISOString() },
        })),

      setHeaderEnabled: (enabled) =>
        set((state) => {
          // First-time enable on a never-configured store: lay down a sensible
          // default band. First-time disable: nothing to remember; no-op.
          if (!state.header) {
            return enabled
              ? {
                  header: defaultBand('header'),
                  meta: { ...state.meta, updatedAt: new Date().toISOString() },
                }
              : state
          }
          if (state.header.enabled === enabled) return state
          if (enabled) {
            // Re-show — preserve every style detail. Inverse of the hide
            // migration: any body field whose bounding box now sits fully
            // INSIDE the header strip (because it was migrated there on
            // the previous hide and the user re-shows the band before
            // moving anything) gets pulled back into `header.fields` with
            // its band-local coordinates restored. Without this, the
            // validator at PDF generation rejects with FIELD_OVERLAPS_BAND
            // for fields that the user never explicitly moved.
            const padX = state.header.style.paddingLeft
            const padY = state.header.style.paddingTop
            const bandH = state.header.style.height
            const insideHeader = (f: FieldDefinition): boolean => f.y + f.height <= bandH
            const reclaim = state.fields.filter(insideHeader)
            const remaining = state.fields.filter((f) => !insideHeader(f))
            const restored = reclaim.map(
              (f) => ({ ...f, x: f.x - padX, y: f.y - padY }) as FieldDefinition,
            )
            return {
              fields: remaining,
              header: {
                ...state.header,
                enabled: true,
                fields: [...state.header.fields, ...restored],
              },
              meta: { ...state.meta, updatedAt: new Date().toISOString() },
            }
          }
          // Hide — migrate band fields to body with page-absolute coords so
          // the user can continue editing them freely. Done atomically with
          // clearing band.fields so the reconciler never sees a duplicate id.
          const bandTop = 0
          const padX = state.header.style.paddingLeft
          const padY = state.header.style.paddingTop
          const migrated = state.header.fields.map(
            (f) => ({ ...f, x: f.x + padX, y: f.y + bandTop + padY }) as FieldDefinition,
          )
          return {
            fields: [...state.fields, ...migrated],
            header: { ...state.header, enabled: false, fields: [] },
            meta: { ...state.meta, updatedAt: new Date().toISOString() },
          }
        }),

      setHeaderStyle: (patch) =>
        set((state) =>
          state.header
            ? {
                header: { ...state.header, style: { ...state.header.style, ...patch } },
                meta: { ...state.meta, updatedAt: new Date().toISOString() },
              }
            : state,
        ),

      addHeaderField: (field) =>
        set((state) =>
          state.header
            ? {
                header: { ...state.header, fields: [...state.header.fields, field] },
                meta: { ...state.meta, updatedAt: new Date().toISOString() },
              }
            : state,
        ),

      updateHeaderField: (id, updates) =>
        set((state) =>
          state.header
            ? {
                header: {
                  ...state.header,
                  fields: state.header.fields.map((f) =>
                    f.id === id ? ({ ...f, ...updates } as FieldDefinition) : f,
                  ),
                },
                meta: { ...state.meta, updatedAt: new Date().toISOString() },
              }
            : state,
        ),

      removeHeaderField: (id) =>
        set((state) =>
          state.header
            ? {
                header: {
                  ...state.header,
                  fields: state.header.fields.filter((f) => f.id !== id),
                },
                meta: { ...state.meta, updatedAt: new Date().toISOString() },
              }
            : state,
        ),

      setFooter: (footer) =>
        set((state) => ({
          footer,
          meta: { ...state.meta, updatedAt: new Date().toISOString() },
        })),

      setFooterEnabled: (enabled) =>
        set((state) => {
          if (!state.footer) {
            return enabled
              ? {
                  footer: defaultBand('footer'),
                  meta: { ...state.meta, updatedAt: new Date().toISOString() },
                }
              : state
          }
          if (state.footer.enabled === enabled) return state
          if (enabled) {
            // Inverse of the hide migration — see `setHeaderEnabled`.
            const bandTop = state.meta.height - state.footer.style.height
            const padX = state.footer.style.paddingLeft
            const padY = state.footer.style.paddingTop
            const insideFooter = (f: FieldDefinition): boolean => f.y >= bandTop
            const reclaim = state.fields.filter(insideFooter)
            const remaining = state.fields.filter((f) => !insideFooter(f))
            const restored = reclaim.map(
              (f) => ({ ...f, x: f.x - padX, y: f.y - bandTop - padY }) as FieldDefinition,
            )
            return {
              fields: remaining,
              footer: {
                ...state.footer,
                enabled: true,
                fields: [...state.footer.fields, ...restored],
              },
              meta: { ...state.meta, updatedAt: new Date().toISOString() },
            }
          }
          const bandTop = state.meta.height - state.footer.style.height
          const padX = state.footer.style.paddingLeft
          const padY = state.footer.style.paddingTop
          const migrated = state.footer.fields.map(
            (f) => ({ ...f, x: f.x + padX, y: f.y + bandTop + padY }) as FieldDefinition,
          )
          return {
            fields: [...state.fields, ...migrated],
            footer: { ...state.footer, enabled: false, fields: [] },
            meta: { ...state.meta, updatedAt: new Date().toISOString() },
          }
        }),

      setFooterStyle: (patch) =>
        set((state) =>
          state.footer
            ? {
                footer: { ...state.footer, style: { ...state.footer.style, ...patch } },
                meta: { ...state.meta, updatedAt: new Date().toISOString() },
              }
            : state,
        ),

      addFooterField: (field) =>
        set((state) =>
          state.footer
            ? {
                footer: { ...state.footer, fields: [...state.footer.fields, field] },
                meta: { ...state.meta, updatedAt: new Date().toISOString() },
              }
            : state,
        ),

      updateFooterField: (id, updates) =>
        set((state) =>
          state.footer
            ? {
                footer: {
                  ...state.footer,
                  fields: state.footer.fields.map((f) =>
                    f.id === id ? ({ ...f, ...updates } as FieldDefinition) : f,
                  ),
                },
                meta: { ...state.meta, updatedAt: new Date().toISOString() },
              }
            : state,
        ),

      removeFooterField: (id) =>
        set((state) =>
          state.footer
            ? {
                footer: {
                  ...state.footer,
                  fields: state.footer.fields.filter((f) => f.id !== id),
                },
                meta: { ...state.meta, updatedAt: new Date().toISOString() },
              }
            : state,
        ),

      setPageNumber: (config) =>
        set((state) => {
          // #61 follow-up: page number stamps INSIDE its placement band, so
          // turning page-numbers on with placement='footer' requires the
          // footer band to exist + be enabled (and symmetrically for
          // header). Without this the core validator rejects the manifest
          // at PDF generation with PAGE_NUMBER_PLACEMENT_INVALID. We
          // atomically enable the target band on the same `set()` so the
          // user can't land in the inconsistent state.
          const next = ensureBandForPageNumber(state, config)
          return {
            ...next,
            pageNumber: config,
            meta: { ...state.meta, updatedAt: new Date().toISOString() },
          }
        }),

      setPageNumberConfig: (patch) =>
        set((state) => {
          if (!state.pageNumber) return state
          const merged = { ...state.pageNumber, ...patch }
          const next = ensureBandForPageNumber(state, merged)
          return {
            ...next,
            pageNumber: merged,
            meta: { ...state.meta, updatedAt: new Date().toISOString() },
          }
        }),

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
          // #61 — route to whichever pool owns this id (body / header / footer).
          // Field-props components (TextFieldProps etc.) only know `updateField`;
          // making the router transparent means they keep working for band fields
          // without per-callsite knowledge of which pool the field lives in.
          if (state.header?.fields.some((f) => f.id === id)) {
            return {
              header: {
                ...state.header,
                fields: state.header.fields.map((f) =>
                  f.id === id ? ({ ...f, ...updates } as FieldDefinition) : f,
                ),
              },
            }
          }
          if (state.footer?.fields.some((f) => f.id === id)) {
            return {
              footer: {
                ...state.footer,
                fields: state.footer.fields.map((f) =>
                  f.id === id ? ({ ...f, ...updates } as FieldDefinition) : f,
                ),
              },
            }
          }
          // `{ ...f, ...updates }` widens the discriminated union — cast back to
          // `FieldDefinition` once the shape is known to match (`type` stays put,
          // style stays wired to its field type). BUG-005 (NIT, Option B): we do
          // NOT guard against a discriminator swap here. Callers never pass a
          // conflicting `type` in practice, and the guard would only trade one
          // inconsistent state for another (type changed, style still the old
          // shape). See templateStore.discriminator.test.ts for the pinned
          // behaviour.
          const fields = state.fields.map((f) =>
            f.id === id ? ({ ...f, ...updates } as FieldDefinition) : f,
          )
          return { fields, ...pushHistory({ ...state, fields, groups: state.groups }) }
        }),

      updateFieldStyle: (id, updates) =>
        set((state) => {
          // #61 — route through the band pool when the field lives there.
          if (state.header?.fields.some((f) => f.id === id)) {
            return {
              header: {
                ...state.header,
                fields: state.header.fields.map((f) =>
                  f.id === id
                    ? ({ ...f, style: { ...f.style, ...updates } } as FieldDefinition)
                    : f,
                ),
              },
            }
          }
          if (state.footer?.fields.some((f) => f.id === id)) {
            return {
              footer: {
                ...state.footer,
                fields: state.footer.fields.map((f) =>
                  f.id === id
                    ? ({ ...f, style: { ...f.style, ...updates } } as FieldDefinition)
                    : f,
                ),
              },
            }
          }
          const fields = state.fields.map((f) =>
            f.id === id ? ({ ...f, style: { ...f.style, ...updates } } as FieldDefinition) : f,
          )
          return { fields, ...pushHistory({ ...state, fields, groups: state.groups }) }
        }),

      setFieldMode: (id, mode) =>
        set((state) => {
          // QA BUG-06: flipping Dynamic → Static used to discard the user's
          // jsonKey and required flag, and the next Static → Dynamic flip
          // regenerated a fresh `text_N`. Cache the dynamic-side metadata on
          // the previous flip so we can restore it on the next round-trip.
          const dynMemo = new Map(fieldDynamicMemo)
          const fields = state.fields.map((f) => {
            if (f.id !== id) return f
            if (!f.source || f.source.mode === mode) return f
            if (f.source.mode === 'static' && mode === 'dynamic') {
              const placeholder = f.source.value as unknown
              const restored = dynMemo.get(id)
              const jsonKey = restored?.jsonKey ?? generateDefaultJsonKey(f.type, state.fields, id)
              const required = restored?.required ?? false
              return {
                ...f,
                source: { mode: 'dynamic', jsonKey, required, placeholder },
              } as FieldDefinition
            }
            if (f.source.mode === 'dynamic' && mode === 'static') {
              // Remember this flip's jsonKey + required so coming back to
              // dynamic restores the user's choices.
              dynMemo.set(id, {
                jsonKey: f.source.jsonKey,
                required: f.source.required,
              })
              const carried = f.source.placeholder
              const value =
                carried !== null && carried !== undefined ? carried : emptyStaticValue(f.type)
              return {
                ...f,
                source: { mode: 'static', value },
              } as FieldDefinition
            }
            return f
          })
          fieldDynamicMemo = dynMemo
          return { fields, ...pushHistory({ ...state, fields, groups: state.groups }) }
        }),

      removeField: (id) =>
        set((state) => {
          // #61 — band-aware removal.
          if (state.header?.fields.some((f) => f.id === id)) {
            return {
              header: {
                ...state.header,
                fields: state.header.fields.filter((f) => f.id !== id),
              },
            }
          }
          if (state.footer?.fields.some((f) => f.id === id)) {
            return {
              footer: {
                ...state.footer,
                fields: state.footer.fields.filter((f) => f.id !== id),
              },
            }
          }
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

      addStaticImage: (filename, dataUrl, buffer) =>
        set((state) => {
          const staticImageBuffers = new Map(state.staticImageBuffers)
          const staticImageDataUrls = new Map(state.staticImageDataUrls)
          staticImageBuffers.set(filename, buffer)
          staticImageDataUrls.set(filename, dataUrl)
          return { staticImageBuffers, staticImageDataUrls }
        }),

      removeStaticImage: (filename) =>
        set((state) => {
          const staticImageBuffers = new Map(state.staticImageBuffers)
          const staticImageDataUrls = new Map(state.staticImageDataUrls)
          staticImageBuffers.delete(filename)
          staticImageDataUrls.delete(filename)
          return { staticImageBuffers, staticImageDataUrls }
        }),

      addPage: (page, bgDataUrl, bgBuffer) =>
        set((state) => {
          // Guard against accidental calls with no argument or a malformed
          // page — pushing `undefined` (or any object without an `id`) into
          // pages[] silently corrupts the array AND breaks IDB persistence
          // (undefined is not JSON-serializable), wiping the template on
          // next reload. See QA BUG-01.
          if (!page || typeof page !== 'object' || typeof page.id !== 'string') {
            console.warn('[templateStore.addPage] ignored: missing or invalid page argument', page)
            return {}
          }
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
        set((state) => {
          // Same defence-in-depth clamp as `setPageSize` — per-page width
          // / height are reached through this mutation too (e.g. the page
          // size dialog for an individual page). Sanitise both before
          // letting them land in the store.
          const sanitised: Partial<PageDefinition> = { ...updates }
          if (typeof sanitised.width === 'number') {
            sanitised.width = clampPageDimension(sanitised.width)
          }
          if (typeof sanitised.height === 'number') {
            sanitised.height = clampPageDimension(sanitised.height)
          }
          return {
            pages: state.pages.map((p) => (p.id === pageId ? { ...p, ...sanitised } : p)),
          }
        }),

      setPageBackground: (pageId, dataUrl, buffer) =>
        set((state) => {
          const pageBackgroundDataUrls = new Map(state.pageBackgroundDataUrls)
          const pageBackgroundBuffers = new Map(state.pageBackgroundBuffers)
          pageBackgroundDataUrls.set(pageId, dataUrl)
          pageBackgroundBuffers.set(pageId, buffer)
          return { pageBackgroundDataUrls, pageBackgroundBuffers }
        }),

      setPage0BackgroundColor: (hex, size) =>
        set((state) => {
          // Find (or create) the page 0 definition.
          const existing = state.pages.find((p) => p.index === 0)
          const pageSize = size?.pageSize ?? state.meta.pageSize
          const width = size?.width ?? state.meta.width
          const height = size?.height ?? state.meta.height
          let pages: PageDefinition[]
          if (existing) {
            pages = state.pages.map((p) =>
              p.index === 0
                ? {
                    ...p,
                    backgroundType: 'color',
                    backgroundColor: hex,
                    backgroundFilename: null,
                    width,
                    height,
                    pageSize,
                  }
                : p,
            )
          } else {
            const page0: PageDefinition = {
              id: `page-0-${Date.now()}`,
              index: 0,
              backgroundType: 'color',
              backgroundColor: hex,
              backgroundFilename: null,
              width,
              height,
              pageSize,
            }
            pages = [page0, ...state.pages]
          }
          return {
            pages,
            // Color-only page 0 has no image background.
            backgroundDataUrl: null,
            backgroundBuffer: null,
            // Mirror page-0 size onto template meta so legacy code paths that
            // still read `meta.width`/`meta.height` (PDF size when `pages[0]`
            // doesn't override, save dialog, JSON preview heuristics) stay
            // consistent. Per-page sizes still win at render time.
            meta: {
              ...state.meta,
              pageSize,
              width,
              height,
              updatedAt: new Date().toISOString(),
            },
          }
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
            canUndo: newIndex > 0,
            canRedo: newIndex < state.history.length - 1,
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
            canUndo: newIndex > 0,
            canRedo: newIndex < state.history.length - 1,
          }
        }),

      // canUndo / canRedo are reactive state fields above — kept in
      // sync by pushHistory / undo / redo / reset (#160).

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
          staticImageBuffers: new Map(),
          staticImageDataUrls: new Map(),
          // #61 — bands and the page-number stamp are part of the template
          // state too; `reset()` returns to the freshly-onboarded shape
          // (no header / no footer / no page number) so callers (e2e
          // beforeEach blocks, etc.) don't see leftover band state.
          header: undefined,
          footer: undefined,
          pageNumber: undefined,
          history: [],
          historyIndex: -1,
          canUndo: false,
          canRedo: false,
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
        staticImageBuffers,
        staticImageDataUrls,
        header,
        footer,
        pageNumber,
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
          staticImageBuffers: staticImageBuffers ?? new Map(),
          staticImageDataUrls: staticImageDataUrls ?? new Map(),
          // #61 — restore band + page-number config from the manifest.
          // Explicitly resetting to `undefined` when omitted so opening a
          // pre-#61 template wipes any band config left over from a
          // previous open of a band-using template.
          header,
          footer,
          pageNumber,
          history: [createSnapshot({ fields, groups })],
          historyIndex: 0,
          // #160 — keep the reactive undo/redo flags in lockstep with the
          // history index. After loadFromManifest the index is 0 (single
          // snapshot, nothing prior to undo, nothing forward to redo).
          canUndo: false,
          canRedo: false,
        }),
    }),
    {
      name: 'template-goblin-template',
      version: PERSIST_VERSION,
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
        staticImageBuffers: state.staticImageBuffers,
        staticImageDataUrls: state.staticImageDataUrls,
        // #61 — bands + page number. Optional; persists only when present
        // so legacy templates restore exactly as before.
        header: state.header,
        footer: state.footer,
        pageNumber: state.pageNumber,
      }),
      // Zustand invokes `migrate` when the stored version differs from the
      // current `version`. Pre-Phase-1 entries were written with implicit
      // version 1 and used top-level `jsonKey`/`required`/`placeholder`;
      // migration rewrites them into the `source: FieldSource<V>` shape.
      migrate: (persistedState, fromVersion) =>
        migratePersistedState(persistedState, fromVersion) as unknown as TemplateState,
      storage: {
        getItem: async (name) => {
          // IndexedDB-backed persistence (GH #11). localStorage's ~5 MB
          // quota is blown by a single real-world photo's data URL, so
          // we've moved to IDB which has gigabyte-scale quotas. On first
          // load after the #11 upgrade we also migrate whatever is sitting
          // in localStorage across to IDB so existing users don't lose
          // their template.
          await migrateFromLocalStorage(name)
          const raw = await idbGet<string>(name)
          if (!raw) return null
          try {
            const parsed = JSON.parse(raw) as { state: PersistedState; version?: number }
            const s = parsed.state
            // GH #113 — heal poisoned page dimensions at rehydrate time.
            // The `setPageSize` / `updatePage` clamp blocks new bad writes,
            // but anyone whose IDB carries a pre-fix `width: -100` would
            // still crash the canvas on next load without this guard.
            clampPersistedPageDimensions(
              s as unknown as Parameters<typeof clampPersistedPageDimensions>[0],
            )
            // Version read — pre-Phase-1 writers used implicit `1`, so
            // default missing/unknown versions to 1 so `migrate` runs.
            const version = typeof parsed.version === 'number' ? parsed.version : 1

            // Reconstruct the image ArrayBuffers from the data URLs we DO
            // persist, so the in-memory store still exposes them for
            // save-to-.tgbl. Pre-#11 entries may also carry the explicit
            // buffer strings; those are preferred when present, otherwise
            // we fall back to decoding the data URL.
            const backgroundBuffer =
              (s.backgroundBuffer ? b642ab(s.backgroundBuffer) : null) ??
              dataUrlToArrayBuffer(s.backgroundDataUrl)

            const pageBgEntries = (s.pageBackgroundDataUrls ?? []).map(([k, url]) => [k, url]) as [
              string,
              string,
            ][]
            const pageBgBufferLegacy = new Map(
              (s.pageBackgroundBuffers ?? []).map(([k, v]) => [k, b642ab(v)] as const),
            )
            const pageBackgroundBuffers = new Map<string, ArrayBuffer>()
            for (const [k, url] of pageBgEntries) {
              const legacy = pageBgBufferLegacy.get(k)
              if (legacy) {
                pageBackgroundBuffers.set(k, legacy)
                continue
              }
              const ab = dataUrlToArrayBuffer(url)
              if (ab) pageBackgroundBuffers.set(k, ab)
            }

            const staticImgDataUrls = new Map(s.staticImageDataUrls ?? [])
            const staticImgBufferLegacy = new Map(
              (s.staticImageBuffers ?? []).map(([k, v]) => [k, b642ab(v)] as const),
            )
            const staticImageBuffers = new Map<string, ArrayBuffer>()
            for (const [k, url] of staticImgDataUrls) {
              const legacy = staticImgBufferLegacy.get(k)
              if (legacy) {
                staticImageBuffers.set(k, legacy)
                continue
              }
              const ab = dataUrlToArrayBuffer(url)
              if (ab) staticImageBuffers.set(k, ab)
            }

            return {
              state: {
                ...s,
                pages: s.pages ?? [],
                backgroundBuffer,
                pageBackgroundDataUrls: new Map(pageBgEntries),
                pageBackgroundBuffers,
                fontBuffers: new Map((s.fontBuffers ?? []).map(([k, v]) => [k, b642ab(v)])),
                placeholderBuffers: new Map(
                  (s.placeholderBuffers ?? []).map(([k, v]) => [k, b642ab(v)]),
                ),
                staticImageBuffers,
                staticImageDataUrls: staticImgDataUrls,
              },
              version,
            }
          } catch (err) {
            // Corrupt JSON or unexpected shape — log so the user/dev sees it,
            // then fall back to the in-memory defaults. Returning `null` tells
            // Zustand to skip rehydration for this entry.

            console.warn('[templateStore] persist rehydration failed:', err)
            return null
          }
        },
        setItem: async (name, value) => {
          const state = (value as { state: TemplateState }).state
          // Image buffers are NOT persisted — the data URLs carry the same
          // bytes and we rebuild buffers from them on rehydration. See the
          // `PersistedState` docstring and GH #11 for context.
          const serialized: PersistedState = {
            meta: state.meta,
            fields: state.fields,
            fonts: state.fonts,
            groups: state.groups,
            pages: state.pages,
            backgroundDataUrl: state.backgroundDataUrl,
            pageBackgroundDataUrls: Array.from(state.pageBackgroundDataUrls.entries()),
            fontBuffers: Array.from(state.fontBuffers.entries()).map(([k, v]) => [k, ab2b64(v)]),
            placeholderBuffers: Array.from(state.placeholderBuffers.entries()).map(([k, v]) => [
              k,
              ab2b64(v),
            ]),
            staticImageDataUrls: Array.from(state.staticImageDataUrls.entries()),
            // #61 — write header / footer / pageNumber alongside the rest
            // so refreshing the editor doesn't lose them. The earlier
            // `partialize` change was insufficient because this custom
            // storage adapter builds its own serialised payload and
            // doesn't honour partialize. Keep both call sites in sync.
            header: state.header,
            footer: state.footer,
            pageNumber: state.pageNumber,
          }
          const payload = JSON.stringify({
            state: serialized,
            version: (value as { version?: number }).version ?? PERSIST_VERSION,
          })
          try {
            await idbSet(name, payload)
          } catch (err) {
            // IDB quotas are gigabyte-scale so failure here should be rare,
            // but we still log instead of throwing through Zustand into
            // React — a template with a borderline-absurd asset budget can
            // still hit the quota or fail mid-transaction.
            console.warn(
              '[templateStore] persist failed — local template state may not survive a reload:',
              err,
            )
          }
        },
        removeItem: async (name) => {
          await idbDelete(name)
          // Also clear any stale localStorage entry from pre-#11 installs so
          // we don't re-migrate it on the next load.
          if (typeof localStorage !== 'undefined') localStorage.removeItem(name)
        },
      },
    },
  ),
)

// Expose for Playwright / dev-mode inspection (mirrors `__fabricCanvas` in
// `useFabricCanvas.ts`). Lets e2e tests drive store updates without
// reaching into private React internals — used by the table-column-sync
// spec to flip headerStyle.color and assert the canvas re-renders.
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as unknown as { __templateStore?: typeof useTemplateStore }).__templateStore =
    useTemplateStore
}
