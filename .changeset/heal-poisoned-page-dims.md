---
'template-goblin-ui': patch
---

fix(store): heal poisoned page dimensions on rehydrate (#113)

Closes the final gap from #113. The write-time `clampPageDimension` in
`setPageSize` / `updatePage` and the manifest validator at PDF generation
already prevent NEW bad state, but anyone whose IndexedDB still carries
`meta.width: -100` (or `null` from a pre-fix `NaN` round-tripping through
JSON) would still rehydrate the bad value verbatim and crash the canvas
on next load.

`clampPersistedPageDimensions` now runs in the persist `getItem` adapter
right after `JSON.parse`, walking `meta.width` / `meta.height` and every
explicitly-set `pages[].width` / `pages[].height` through the same
≥ 1pt floor used on the write path. Anything non-numeric, non-finite,
or below 1 heals to 1.
