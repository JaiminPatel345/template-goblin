---
'template-goblin-ui': minor
---

feat(ui): v3 design system — Linear-style palette, unified outlined-button system, Radix tooltips (#64)

Real top-to-bottom redesign of the editor chrome, not a repaint:

**Design tokens (`packages/ui/src/styles/theme.css`)** — single source of
truth for colour, spacing, typography, radius, shadow, motion, z-index,
focus-ring, and control-sizing scales. Both light and dark themes live
side by side, gated by `data-theme`. Replaces the previous split
`@theme` + legacy-bridge blocks in `App.css`.

**Palette swap** — hot-pink `#e94560` (which read as warning / error
across every control it touched) traded for Linear-style indigo
`#5E6AD2` (light) / `#7C87E0` (dark). Neutrals refined toward slate-cool
in both themes; the yellow-tinted off-white `--bg-primary` is gone.
Indigo also drives the focus ring and the new tooltip arrow.

**Unified control system** — every interactive control shares one
height (`--control-height-md = 28px`) and one icon size
(`--icon-size-md = 16px`). The ribbon-button column-vs-row split that
made the old toolbar look unsorted (Left/Right stacked vertically vs
Snap label-only vs Zoom row-compact vs Light icon+text) is gone — every
button is now a single horizontal row of icon + label, on the same
baseline. Icon-only buttons collapse to a perfect 28×28 square.

**Outlined-button idiom across the whole nav bar** — File / Edit /
Insert / Format / View / Help tabs + Text / Image / Table pinned tools

- Preview / Save / Lock CTAs all use one outlined-button system: 1 px
  border at rest, fills on hover, indigo soft-fill + indigo border when
  active. No 3 D inset shadow tricks. Same idiom Tailwind UI, shadcn,
  GitHub button-groups, and Stripe Dashboard use.

**Distinct band icons** — Header (page + top bar), Footer (page +
bottom bar), Page Number (page + bold `#`). The three previously
shared one generic `PageLayoutIcon` glyph, which read as a copy-paste
mistake.

**Radix Tooltip** — added `@radix-ui/react-tooltip` and a token-styled
`Tooltip` primitive. Every `RibbonButton` with a `title` wraps in the
tooltip, with 600 ms open-delay (Linear / Figma / GitHub all sit in
500–700 ms) and an arrow tinted to `--bg-elevated`. `@radix-ui/react-
dialog` is also installed in preparation for the upcoming dialog-
system pass.

**Snap toggle now visibly works** — `buildGridLines` was stroking the
grid with `rgba(255,255,255,0.08)` (white-on-white on the default page
background). Switched to `rgba(0,0,0,0.14)` — a thin lattice that
reads on white, off-white, and lightly-coloured page backgrounds, and
stays subtle on dark pages.

**JSON Preview** — the code block sat on `--bg-primary` which is the
deepest surface in dark mode, so it recessed into the panel instead of
reading as a raised tile. Switched to `--bg-tertiary` with
`--border-light`; same fix applies to the empty-state card. The
`Format / Max Fill / Copy` mode buttons now use the same outlined-
button selected treatment as everything else.

**Affordances** — global `:focus-visible` ring driven by `--ring-color`,
`::selection` tinted to the accent, `prefers-reduced-motion` flattens
transitions, `color-scheme` hint so native form controls track the
theme.

Verified live in Chrome via the MCP extension across both themes — all
ribbons, tooltips, Snap toggle, theme toggle, onboarding flow.
