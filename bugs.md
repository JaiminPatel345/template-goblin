# Bugs & Improvements — now tracked on GitHub Issues

Open items for TemplateGoblin live in the project's GitHub Issues and are manually closed by the repo owner (`JaiminPatel345`) once verified:

https://github.com/JaiminPatel345/template-goblin/issues

## Current open issues

- [#1](https://github.com/JaiminPatel345/template-goblin/issues/1) — Double-click on newly-created element does not open properties; element cannot be moved (bug)
- [#2](https://github.com/JaiminPatel345/template-goblin/issues/2) — Zoom not working (pending user verification)
- [#3](https://github.com/JaiminPatel345/template-goblin/issues/3) — IMP-1 Rectangle label overhaul (pending user verification)
- [#4](https://github.com/JaiminPatel345/template-goblin/issues/4) — IMP-2 Per-type soft color coding (pending user verification)
- [#5](https://github.com/JaiminPatel345/template-goblin/issues/5) — IMP-3 Skip rect fill when image has a placeholder (pending user verification)
- [#6](https://github.com/JaiminPatel345/template-goblin/issues/6) — IMP-4 Skip rect fill for static elements (pending user verification)

## Workflow

1. User reports a bug or improvement in chat.
2. Reviewer agent validates, updates affected specs (`specs/` and `docs/superpowers/specs/`), and creates a GitHub issue via `gh issue create`.
3. Dev + QA land code + tests, reference the issue number in commit messages.
4. User manually closes the issue once they verify the fix in the running UI.

## User-approved resolved items (for history)

These were confirmed by the user and do not need GH issues. Left here for reference.

- BUG-A — Runtime crash on hydrating pre-Phase-1 localStorage. Fix `d590007` + `d8ef03d`.
- BUG-D — Closing Page 1 closes all pages. Fix `fcb887a`.
- BUG-E — Close-all-then-add-page showed stale elements. Fix `fcb887a` (side-effect of D).
- BUG-F — "Same as previous" was a live reference instead of a snapshot. Fix `adecb5a` + `435be01`.
- Phantom Page 2 tab after solid-color onboarding. Fix `fd075f1`.
- Sidebars not visible after solid-color onboarding. Fix `fcb887a`.
- Font Manager multi-file upload. Fix `ee44961`.
