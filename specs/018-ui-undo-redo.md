# Spec 018 — UI Undo/Redo

## Status

Draft

## Summary

Defines the undo/redo system for the template builder UI. All canvas state changes are tracked in a history stack managed by Zustand. Users can undo and redo actions via keyboard shortcuts (Ctrl+Z / Cmd+Z for undo, Ctrl+Shift+Z / Cmd+Shift+Z for redo) or toolbar buttons. The system tracks field additions, removals, moves, resizes, property changes, z-index changes, and group changes. The history stack has a configurable limit (default: 50 steps) and toolbar buttons reflect disabled state when nothing is available to undo or redo.

## Requirements

- [ ] REQ-001: Track all canvas state changes in a history stack managed by Zustand.
- [ ] REQ-002: Support undo via Ctrl+Z (Windows/Linux) and Cmd+Z (macOS).
- [ ] REQ-003: Support redo via Ctrl+Shift+Z (Windows/Linux) and Cmd+Shift+Z (macOS).
- [ ] REQ-004: Provide undo and redo buttons in the toolbar.
- [ ] REQ-005: Toolbar undo button MUST be disabled (greyed out, non-clickable) when the history stack has no past states.
- [ ] REQ-006: Toolbar redo button MUST be disabled (greyed out, non-clickable) when the history stack has no future states.
- [ ] REQ-007: Track the following actions: add field, remove field, move field, resize field, property changes (any value change in the right panel), z-index changes (bring to front, send to back), and group changes (assign/unassign field to group).
- [ ] REQ-008: Enforce a history limit of 50 steps by default. When the limit is reached, the oldest entry is discarded to make room for the new one.
- [ ] REQ-009: The history limit MUST be configurable (e.g., via a settings object or constant).
- [ ] REQ-010: Performing a new action after one or more undos MUST discard the redo stack (standard undo branch behaviour).
- [ ] REQ-011: Undo/redo MUST restore the full canvas state for the affected action, including field positions, sizes, and all properties.

## Behaviour

### Happy Path

1. User adds a text field to the canvas. History stack: `[S0]`, pointer at `S1` (current state).
2. User moves the field to a new position. History: `[S0, S1]`, pointer at `S2`.
3. User changes the field's font size. History: `[S0, S1, S2]`, pointer at `S3`.
4. User presses Ctrl+Z. Canvas reverts to state before font size change. History: `[S0, S1, S2]`, pointer at `S2`. Redo button becomes enabled.
5. User presses Ctrl+Z again. Canvas reverts to state before the move. Pointer at `S1`.
6. User presses Ctrl+Shift+Z. Canvas re-applies the move. Pointer at `S2`.
7. User makes a new change (e.g., changes colour). The redo stack (S3 — the font size change) is discarded. History: `[S0, S1, S2]`, pointer at new `S3`.

### Edge Cases

- Undo with nothing to undo (empty past stack): no action, no error. The undo button is already disabled.
- Redo with nothing to redo (empty future stack): no action, no error. The redo button is already disabled.
- Rapid successive undos (user holds Ctrl+Z): each keypress triggers one undo step. No debouncing — each step should apply quickly enough for responsive traversal.
- History limit reached (50 entries): adding a 51st entry discards the oldest (entry 0). The user can still undo up to 50 steps back from current.
- Batch operations (e.g., deleting a group of fields): treated as a single undo step. Undoing restores all fields in the group simultaneously.
- Property changes via slider (e.g., font size drag): individual intermediate values should be coalesced into a single history entry. Only the final value when the slider is released is recorded. This avoids flooding the history with micro-steps.
- Undo/redo while template is locked (Spec 017): undo and redo are disabled. Keyboard shortcuts and toolbar buttons have no effect.
- Canvas is empty and user undoes the last "add field" action: canvas returns to the empty state. The redo stack contains the add-field action.

### Error Conditions

- No error conditions are expected for undo/redo. The system operates entirely on in-memory state snapshots. If memory pressure causes issues with 50 full state snapshots, the history limit should be reduced (see Notes).

## Input / Output

```typescript
// History entry: a snapshot of canvas state
interface HistoryEntry {
  fields: CanvasField[] // full snapshot of all fields and their properties
  timestamp: number // when this state was recorded
  actionLabel: string // human-readable label, e.g., "Move text field", "Change font size"
}

// Zustand store slice for undo/redo
interface UndoRedoState {
  past: HistoryEntry[] // states before current
  present: HistoryEntry // current state
  future: HistoryEntry[] // states after current (redo stack)
  historyLimit: number // default 50

  pushState: (entry: HistoryEntry) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void
  setHistoryLimit: (limit: number) => void
}

// React component props for toolbar buttons
interface UndoRedoToolbarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

// Action coalescing for continuous operations (e.g., sliders)
interface CoalesceOptions {
  actionType: string // e.g., "resize", "move", "property-change"
  fieldId: string
  debounceMs: number // default 300ms — coalesce changes within this window
}
```

## Acceptance Criteria

- [ ] AC-001: Adding a field and pressing Ctrl+Z / Cmd+Z removes the field from the canvas.
- [ ] AC-002: After undoing, pressing Ctrl+Shift+Z / Cmd+Shift+Z re-adds the field at its original position with all properties intact.
- [ ] AC-003: The toolbar undo button is disabled when there are no past states in the history.
- [ ] AC-004: The toolbar redo button is disabled when there are no future states in the history.
- [ ] AC-005: After undoing and then making a new change, the redo stack is cleared and the redo button becomes disabled.
- [ ] AC-006: Moving a field and undoing restores the field to its pre-move position.
- [ ] AC-007: Changing a property in the right panel and undoing restores the previous property value.
- [ ] AC-008: The history stack does not exceed the configured limit (default 50). When the 51st action occurs, the oldest entry is discarded.
- [ ] AC-009: Slider-driven property changes (e.g., dragging to resize) are coalesced into a single history entry.
- [ ] AC-010: Deleting a group of fields and undoing restores all fields in the group simultaneously.
- [ ] AC-011: Undo and redo are disabled when the template is locked (Spec 017).
- [ ] AC-012: Each history entry includes a human-readable action label (e.g., "Move text field", "Change font size").

## Dependencies

- Spec 009 — UI Canvas (provides the canvas state model that is snapshotted for history entries)

## Notes

- The history implementation uses full state snapshots rather than command/inverse-command pairs. This is simpler to implement and reason about, at the cost of higher memory usage. For a typical template with 20-50 fields, 50 snapshots should be well within browser memory limits. If profiling reveals memory issues, a structural sharing approach (e.g., Immer patches) can be adopted without changing the external API.
- Action coalescing is critical for usability. Without it, dragging a field across the canvas would generate dozens of history entries (one per mousemove). The coalescing window (300ms default) should be tuned during development.
- Open question: should the history persist across browser sessions (e.g., stored in IndexedDB)? Current spec assumes in-memory only — history is lost on page refresh. Session persistence could be a future enhancement.
- Open question: should the action labels be shown in a visible history list (like Photoshop's History panel)? Current spec only uses labels for accessibility (tooltip on undo/redo buttons showing what will be undone/redone). A full history panel could be a future feature.
