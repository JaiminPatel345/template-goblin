---
'template-goblin-ui': minor
---

feat(ui): replace native alert / confirm / prompt with Radix-based custom dialog primitives (#158)

Every browser-native dialog the app was firing (`window.alert`,
`window.confirm`, `window.prompt`) is replaced by a token-styled
custom equivalent built on `@radix-ui/react-dialog`. The new
surface is consistent with the rest of the v3 chrome — same
theme, same focus-trap a11y, same animations, same Esc / overlay-
click semantics.

**New primitives** in `packages/ui/src/components/Dialogs/`:

- `<DialogProvider>` — wraps `<App />` in `main.tsx`, owns the
  single active dialog (no stacking; matches native).
- `useDialogs()` — hook returning `{ alert, confirm, prompt }`.
  Each call returns a Promise that resolves cleanly on dismiss
  (no rejections):
  - `alert({ title, message, variant? })` → `Promise<void>`
  - `confirm({ title, message, destructive? })` → `Promise<boolean>`
  - `prompt({ title, label, validate? })` → `Promise<string | null>`
- `<DialogShell>` (internal) + `<DialogButton>` (internal) —
  shared chrome + action buttons.

**Replaced call-sites:**

- `LeftPanel/FieldList` — group-name prompt now uses the
  PromptDialog with an inline validator (empty trim → error,
  OK disabled).
- `Toolbar/ribbons/FileRibbon` — File → New confirmation +
  open-file error toast → ConfirmDialog + AlertDialog.
- `Toolbar/MenuTabBar` — Save error + dropped-fields warning →
  AlertDialog (variants: danger / warning).
- `Toolbar/Toolbar` — image-upload size / type / dimension
  errors → AlertDialog.
- `Toolbar/FontManager` — font size + magic-byte errors,
  remove-in-use confirmation → Alert + ConfirmDialog.
- `Toolbar/ribbons/HelpRibbon` — keyboard shortcut dump →
  AlertDialog with multi-line message.
- `Canvas/usePageHandlers` — last-page delete confirmation →
  ConfirmDialog with destructive accent.
- `hooks/useKeyboard` — Save / Open error toasts on Ctrl+S /
  Ctrl+O → AlertDialog.

**Tests:**

- `e2e/issue-158-dialog-primitives.spec.ts` — 3 tests covering
  PromptDialog (happy path + validation), AlertDialog
  (shortcuts).
- `e2e/bug-09-save-drops-warn.spec.ts` (#137) and
  `e2e/ux-04-new-confirm.spec.ts` (#150) — updated to drive the
  new dialog via its testid instead of stubbing
  `window.alert` / `window.confirm`.

No native dialog calls remain in `packages/ui/src/` outside test
files. The Radix `react-dialog` dep was already installed for
#64; this PR is the first real consumer of it.
