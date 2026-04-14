# Spec 020 — UI Field Groups

## Status

Draft

## Summary

Introduces named field groups to the TemplateGoblin UI, allowing designers to organize fields into logical categories (e.g., "Student Info", "Marks Table") for easier navigation in the left panel. Groups are purely organizational and do not affect JSON key structure or PDF output. The left panel displays fields sorted by group, with collapsible sections and an "Ungrouped" section for unassigned fields.

## Requirements

- [ ] REQ-001: Allow creating named groups with a unique `id` and a human-readable `label`.
- [ ] REQ-002: Allow assigning each field to at most one group or no group.
- [ ] REQ-003: Display fields in the left panel organized by group, with each group as a collapsible/expandable section.
- [ ] REQ-004: Show an "Ungrouped" section at the bottom of the left panel for fields not assigned to any group.
- [ ] REQ-005: Allow renaming groups after creation.
- [ ] REQ-006: Allow deleting groups; fields in a deleted group move to "Ungrouped."
- [ ] REQ-007: Allow reordering groups via drag-and-drop in the left panel.
- [ ] REQ-008: Allow moving fields between groups via drag-and-drop or a context menu.
- [ ] REQ-009: Persist groups in the manifest `groups[]` array with `id`, `label`, and `fieldIds`.
- [ ] REQ-010: Groups are organizational only -- they MUST NOT affect the JSON data key structure or PDF generation output.
- [ ] REQ-011: Include group names as JSON comments in exported/displayed JSON for clarity when viewing template data schemas.

## Behaviour

### Happy Path

1. Designer opens the UI with a template containing several fields.
2. Designer right-clicks in the left panel or clicks a "New Group" button.
3. A new group appears with an editable name (e.g., "Student Info").
4. Designer drags fields into the group; they appear nested under the group header.
5. Designer collapses the group to hide its fields, reducing visual clutter.
6. Designer creates a second group ("Marks Table") and assigns the loop field to it.
7. On save, the manifest `groups[]` array is populated with each group's `id`, `label`, and `fieldIds`.
8. On reload, fields appear under their respective groups in the left panel.

### Edge Cases

- Creating a group with a duplicate label: allow it (labels are display-only; `id` is the unique key).
- Deleting the last group: the "Ungrouped" section remains and contains all fields.
- A field referenced by a group's `fieldIds` no longer exists in `fields[]`: silently remove the stale reference on load.
- Empty groups (no fields assigned): allowed; displayed as collapsed with a "(empty)" indicator.
- Manifest loaded with no `groups[]` key: treat as an empty array; all fields appear under "Ungrouped."

### Error Conditions

- Group `id` collision on creation: auto-generate a unique `id` to prevent duplicates.
- Attempting to assign a field to multiple groups simultaneously: reject and show an inline message "A field can only belong to one group."

## Input / Output

```typescript
interface GroupEntry {
  id: string
  label: string
  fieldIds: string[]
}

// UI: create a new group
function createGroup(label: string): GroupEntry

// UI: rename a group
function renameGroup(groupId: string, newLabel: string): void

// UI: delete a group (fields move to ungrouped)
function deleteGroup(groupId: string): void

// UI: assign a field to a group (removes from previous group if any)
function assignFieldToGroup(fieldId: string, groupId: string | null): void

// UI: reorder groups
function reorderGroups(orderedGroupIds: string[]): void
```

## Acceptance Criteria

- [ ] AC-001: A new group can be created with a custom label and appears in the left panel.
- [ ] AC-002: Fields dragged into a group appear nested under that group's header.
- [ ] AC-003: Collapsing a group hides its fields; expanding reveals them.
- [ ] AC-004: Fields not assigned to any group appear under the "Ungrouped" section.
- [ ] AC-005: Deleting a group moves its fields to "Ungrouped" without deleting the fields themselves.
- [ ] AC-006: Renaming a group updates its label in the left panel and in the saved manifest.
- [ ] AC-007: The manifest `groups[]` array correctly reflects group structure after save.
- [ ] AC-008: Reloading a saved template restores groups and field assignments in the left panel.
- [ ] AC-009: Groups do not alter the JSON data key structure -- data keys remain flat regardless of grouping.
- [ ] AC-010: Reordering groups via drag-and-drop persists the new order in the manifest.

## Dependencies

- Spec 002 — Template Schema (manifest `groups[]` array structure).
- Spec 009 — UI Builder (left panel, field list, drag-and-drop interactions).

## Notes

- Groups are a UI convenience feature. They exist solely to help designers manage templates with many fields.
- Open question: should groups support nesting (sub-groups)? For v1, the answer is no -- flat groups only.
- Open question: should the JSON comment with group names be included in generated sample data, or only in the schema view?
