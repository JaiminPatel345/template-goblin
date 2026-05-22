---
'template-goblin-ui': minor
---

feat(ui): Word-style menu + ribbon top bar redesign (#128)

The single-row 657-line `Toolbar.tsx` crammed every action together with
no grouping. Replaced with a two-row Word-style shell.

**Row 1 — Menu tab strip:**
File · Edit · Insert · Format · View · Help &nbsp;|&nbsp;
pinned tools (Text · Image · Table) &nbsp;|&nbsp;
Preview · Save · Lock

**Row 2 — Ribbon:** swaps to match the active tab. Each tab's controls
get a dedicated, always-visible row so common actions are one click
away (Word ribbon model), and pinned Insert tools stay reachable from
any tab.

**Tab contents:**

- **File** — New · Open · Change Background
- **Edit** — Undo · Redo
- **Insert** — Header · Footer · Page Number (each opens a settings
  popup containing the show/hide toggle + all options)
- **Format** — Properties panel toggle · Font Manager
- **View** — Toggle left/right panels · Snap · Zoom −/%/+ · Theme
- **Help** — GitHub · Shortcuts

**Page Number placement** can land in either Header or Footer
regardless of whether the chosen band is currently enabled — the
store's `ensureBandForPageNumber` helper auto-creates+enables the
target band on placement pick. No "enable a header first" friction.

**Pinned Insert tools** (Text / Image / Table) keep the same one-click
draw-to-create UX from before and stay visible across every tab. Lock
toggles template-wide; the pinned tools disable when locked.

**File structure** under `Toolbar/`:

- `Toolbar.tsx` — empty-state OR two-row shell (~120 LOC)
- `MenuTabBar.tsx`, `RibbonBar.tsx`
- `icons.tsx` — shared inline SVGs (Hard Rule #7)
- `primitives/MenuButton.tsx`, `RibbonButton.tsx`, `RibbonGroup.tsx`
- `ribbons/FileRibbon.tsx`, `EditRibbon.tsx`, `InsertRibbon.tsx`,
  `FormatRibbon.tsx`, `ViewRibbon.tsx`, `HelpRibbon.tsx`

Themed with CSS variables (`--bg-secondary`, `--bg-tertiary`,
`--text-primary`, `--accent`, …); every button is a `.tg-ribbon-btn`
or `.tg-menu-tab` so Tailwind v4 preflight's base-layer
`button { background-color: transparent }` doesn't strip the active
highlight. Verified live in Chrome — menubar/ribbon/text/tab colours
all flip correctly between light and dark themes.

UI store gains a single new field: `activeMenuTab: 'file' | 'edit' |
'insert' | 'format' | 'view' | 'help'` (default `'insert'`).

Comprehensive Playwright coverage in `e2e/navbar-redesign.spec.ts`
(32 tests) hitting every visible button — happy path + edge cases:
locked template, multi-tab swap, theme persistence, popup auto-create
on placement pick, etc. Existing band/color/onboarding/page-dim/
change-bg specs (5 specs touched) updated to the new selectors; full
sweep: 87/88 pass / 1 unrelated skip.

Closes #128.
