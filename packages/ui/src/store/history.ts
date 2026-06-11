import type { FieldDefinition, GroupDefinition, PageBand } from '@template-goblin/types'

/**
 * Undo/redo history for the template store — extracted from
 * `templateStore.ts` (Hard Rule #11) and extended to cover band fields.
 *
 * A snapshot is the full undoable document state: body fields, groups,
 * AND the header/footer bands (#61). Pre-fix snapshots carried only
 * fields+groups, which made undo blind to band edits — worse, hiding a
 * band (which migrates its fields into the body pool) followed by
 * Ctrl+Z restored a body array from BEFORE the migration while the band
 * was already empty: the fields vanished from both pools with no
 * recovery.
 */
export interface HistorySnapshot {
  fields: FieldDefinition[]
  groups: GroupDefinition[]
  header: PageBand | undefined
  footer: PageBand | undefined
}

/** The slice of the template store the history engine reads and writes. */
export interface HistoryState {
  fields: FieldDefinition[]
  groups: GroupDefinition[]
  header?: PageBand
  footer?: PageBand
  history: HistorySnapshot[]
  historyIndex: number
  maxHistory: number
  canUndo: boolean
  canRedo: boolean
}

type DocumentState = Pick<HistoryState, 'fields' | 'groups' | 'header' | 'footer'>

export function createSnapshot(state: DocumentState): HistorySnapshot {
  return {
    fields: structuredClone(state.fields),
    groups: structuredClone(state.groups),
    header: state.header ? structuredClone(state.header) : undefined,
    footer: state.footer ? structuredClone(state.footer) : undefined,
  }
}

/**
 * Append a snapshot of the (post-mutation) state. Callers spread the
 * result into their `set()` return: `{ fields, ...pushHistory({ ...state, fields }) }`.
 */
export function pushHistory(state: HistoryState): Partial<HistoryState> {
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

/** Restore one step back. Returns `null` when there's nothing to undo. */
export function applyUndo(state: HistoryState): Partial<HistoryState> | null {
  if (state.historyIndex <= 0) return null
  const newIndex = state.historyIndex - 1
  const snapshot = state.history[newIndex]
  if (!snapshot) return null
  return restoreSnapshot(snapshot, newIndex, state.history.length)
}

/** Restore one step forward. Returns `null` when there's nothing to redo. */
export function applyRedo(state: HistoryState): Partial<HistoryState> | null {
  if (state.historyIndex >= state.history.length - 1) return null
  const newIndex = state.historyIndex + 1
  const snapshot = state.history[newIndex]
  if (!snapshot) return null
  return restoreSnapshot(snapshot, newIndex, state.history.length)
}

function restoreSnapshot(
  snapshot: HistorySnapshot,
  newIndex: number,
  historyLength: number,
): Partial<HistoryState> {
  return {
    fields: structuredClone(snapshot.fields),
    groups: structuredClone(snapshot.groups),
    header: snapshot.header ? structuredClone(snapshot.header) : undefined,
    footer: snapshot.footer ? structuredClone(snapshot.footer) : undefined,
    historyIndex: newIndex,
    canUndo: newIndex > 0,
    canRedo: newIndex < historyLength - 1,
  }
}
