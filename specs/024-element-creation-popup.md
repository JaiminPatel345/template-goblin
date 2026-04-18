# Spec 024 — Element Creation Popup

## Status

Stub — full spec to be completed in Phase 4 implementation plan.

## Summary

When the designer finishes drawing a rectangle with the text / image / table tool, a modal popup opens capturing (a) the static-versus-dynamic mode toggle, (b) the mode-specific input block (static value or dynamic `jsonKey` + required + placeholder), and (c) the full style controls for the chosen field type. Confirming the popup commits the field to the store; cancelling discards the drawn rectangle. Keyboard shortcuts: `Esc` cancels, `Cmd/Ctrl+Enter` confirms.

See `docs/superpowers/specs/2026-04-18-static-dynamic-fields-design.md` §8.1 for the authoritative interaction design.

## Requirements

_To be completed in Phase 4._

## Acceptance Criteria

_To be completed in Phase 4._

## Dependencies

- Spec 009 — UI Canvas (draw-release triggers this popup).
- Spec 023 — Field Source Model (shape of `source` committed on confirm).
