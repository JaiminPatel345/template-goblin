# Spec 017 — UI Template Locking

## Status

Draft

## Summary

Defines the template locking feature in the template builder UI. A "Lock Template" toggle in the toolbar allows the user to lock the canvas into a read-only state, preventing all modifications (move, resize, add, edit, delete). The locked state is persisted in the `.tgbl` file's manifest under `meta.locked`. When locked, the UI displays a lock icon in the toolbar and a semi-transparent overlay on the canvas. Preview and JSON preview modes remain fully functional. The user must explicitly click "Unlock" to resume editing.

## Requirements

- [ ] REQ-001: Add a "Lock Template" toggle button to the toolbar that switches between locked and unlocked states.
- [ ] REQ-002: When locked, the canvas MUST be fully read-only: no field moving, resizing, adding, editing properties, deleting, or z-index changes.
- [ ] REQ-003: The locked state MUST be saved in the `.tgbl` manifest under `meta.locked` (boolean).
- [ ] REQ-004: When locked, display a lock icon on the toolbar button and a semi-transparent overlay on the canvas to visually indicate the locked state.
- [ ] REQ-005: The user MUST explicitly click the "Unlock" button (the same toggle) to return to editing mode. There is no automatic unlock.
- [ ] REQ-006: PDF preview (Spec 015) MUST remain fully functional when the template is locked.
- [ ] REQ-007: JSON preview (Spec 014) MUST remain fully functional when the template is locked, including mode switching and copy.
- [ ] REQ-008: When a locked template is opened via "Open .tgbl" (Spec 016), the canvas MUST load in locked state if `meta.locked` is `true` in the manifest.
- [ ] REQ-009: Keyboard shortcuts for field manipulation (delete, arrow-key nudge, copy/paste) MUST be disabled when locked.
- [ ] REQ-010: The right panel MUST show field properties in a read-only/disabled state when locked — visible but not editable.

## Behaviour

### Happy Path

1. User has a completed template on the canvas.
2. User clicks "Lock Template" in the toolbar.
3. The toolbar button changes to show a lock icon with the label "Unlock".
4. A semi-transparent overlay appears over the canvas.
5. User attempts to drag a field — nothing happens. Cursor changes to `not-allowed` on hover over fields.
6. User attempts to add a new field from the field palette — the add action is disabled or shows a tooltip "Template is locked".
7. User clicks on a field — the right panel shows properties but all inputs are disabled (greyed out).
8. User switches JSON preview to Max mode — the preview updates normally.
9. User clicks "Preview" — PDF generates and displays normally.
10. User clicks "Unlock" — the overlay disappears, the toolbar button returns to "Lock Template", and full editing is restored.

### Edge Cases

- Locking while a field is selected: the field remains visually selected but becomes non-interactive. The right panel switches to read-only display of its properties.
- Locking while a drag operation is in progress: the drag is cancelled and the field returns to its pre-drag position.
- Locking while a property is mid-edit in the right panel (e.g., user is typing a font size): the current value is committed and the input becomes disabled.
- Opening a `.tgbl` file without a `meta.locked` field: default to unlocked (`meta.locked = false`).
- Undo/redo (Spec 018) while locked: undo/redo actions are disabled. The history stack is preserved but not actionable until unlocked.
- Save while locked: the saved `.tgbl` file includes `meta.locked: true`. Reopening it will restore the locked state.

### Error Conditions

- No error conditions specific to locking. The feature is a UI state toggle with no failure modes beyond standard browser issues. If the canvas overlay fails to render (CSS issue), the lock state is still enforced at the interaction-handler level, not just visually.

## Input / Output

```typescript
// Manifest meta extension for locking
interface TemplateMeta {
  locked: boolean
  // ... other meta fields
}

// Lock state in Zustand store
interface LockState {
  isLocked: boolean
  lock: () => void
  unlock: () => void
  toggle: () => void
}

// React component props for the lock toggle
interface LockToggleProps {
  isLocked: boolean
  onToggle: () => void
}

// Canvas overlay component props
interface LockOverlayProps {
  isLocked: boolean
}
```

## Acceptance Criteria

- [ ] AC-001: Clicking "Lock Template" sets the canvas to read-only and changes the button to display a lock icon with "Unlock" label.
- [ ] AC-002: When locked, dragging a field on the canvas has no effect and the cursor shows `not-allowed`.
- [ ] AC-003: When locked, adding a new field from the field palette is disabled.
- [ ] AC-004: When locked, the right panel displays field properties with all inputs disabled/greyed out.
- [ ] AC-005: When locked, keyboard shortcuts for field manipulation (Delete, arrow keys, Ctrl+C/V) are non-functional.
- [ ] AC-006: A semi-transparent overlay is visible over the canvas when locked.
- [ ] AC-007: JSON preview mode switching and copy functionality work normally when locked.
- [ ] AC-008: PDF preview generation and display work normally when locked.
- [ ] AC-009: Saving a locked template produces a `.tgbl` file with `meta.locked: true` in the manifest.
- [ ] AC-010: Opening a `.tgbl` file with `meta.locked: true` loads the canvas in locked state.
- [ ] AC-011: Clicking "Unlock" restores full editing capability and removes the overlay.
- [ ] AC-012: Opening a `.tgbl` file without a `meta.locked` field defaults to unlocked.

## Dependencies

- Spec 002 — Template Schema (the manifest schema must accommodate `meta.locked`)
- Spec 009 — UI Canvas (canvas interaction handlers must check the lock state before processing events)

## Notes

- The semi-transparent overlay is a visual indicator only. The actual enforcement of read-only behaviour must happen at the event-handler level (disabling pointer events on field interaction handlers, disabling keyboard shortcuts, disabling right-panel inputs). The overlay alone is not sufficient because screen readers and keyboard navigation could bypass a purely visual overlay.
- Open question: should there be a password or PIN to unlock, for use cases where a designer hands off a locked template to a developer who should not modify it? This could be a future enhancement; for now, the unlock is a simple toggle.
- Open question: should the lock state be part of undo/redo history? Current spec says no — locking and unlocking are meta-actions outside the edit history stack.
