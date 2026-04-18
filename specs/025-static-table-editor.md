# Spec 025 — Static Table Inline Editor

## Status

Stub — full spec to be completed in Phase 6 implementation plan.

## Summary

When the designer creates or edits a static table field, an inline spreadsheet-style grid lets them add, remove, and reorder columns (with `key`, `label`, and `width`) and add, remove, and edit rows (one cell per column, each a text input). The live canvas preview updates on blur (not on every keystroke) to keep rendering cheap. Up to `style.maxRows` rows are permitted. Column `key` values are validated as alphanumeric + underscore and must be unique within the table.

See `docs/superpowers/specs/2026-04-18-static-dynamic-fields-design.md` §8.4 for the authoritative interaction design.

## Requirements

_To be completed in Phase 6._

## Acceptance Criteria

_To be completed in Phase 6._

## Dependencies

- Spec 012 — UI Table Field (hosts the inline editor).
- Spec 023 — Field Source Model (static-table rows are `source.value` of type `TableRow[]`).
