---
'template-goblin': minor
'template-goblin-ui': patch
---

Preview now runs the real `generatePDF` instead of a parallel HTML
pipeline (#86) — the bytes the user sees in the preview tab are
byte-identical to what a library consumer gets from
`generatePDF(template, data)`. Pre-fix the two renderers drifted on every
detail (header height, row fitting, font metrics, table border behaviour,
multi-page logic), so every renderer-level bug had to be fixed twice.

`template-goblin` adds a new `"./browser"` subpath export — slim entry
that re-exports `generatePDF`, `validateData`, `validateManifest`,
`resolveValue`, and font-subsetting helpers without pulling in the
fs-backed `loadTemplate` / `saveTemplate` chain. The package's main
export is unchanged.
