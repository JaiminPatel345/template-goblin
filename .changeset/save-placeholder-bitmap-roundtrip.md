---
'template-goblin-ui': patch
---

Fix placeholder-bitmap save→reopen round-trip (#50). The UI's `openTemplate` was looking for placeholder images at the bare filename (e.g. `placeholder-field-1-dp.png`) but `saveTemplate` writes them under `placeholders/<filename>` — so a `.tgbl` opened in a clean browser session lost every placeholder, the canvas fell back to filename text instead of the bitmap, and a re-save propagated the missing bytes downstream. Loader now resolves `placeholders/<filename>` first and falls back to the bare path for legacy archives.
