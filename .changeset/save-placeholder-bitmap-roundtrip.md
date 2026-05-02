---
'template-goblin-ui': patch
---

Fix placeholder-bitmap save→reopen round-trip (#50) and make the Image Settings Upload buttons visible at rest.

- `openTemplate` now resolves placeholder bitmaps at `placeholders/<filename>` (matching where `saveTemplate` writes them) with a fallback to the bare path for legacy archives. Previously the loader looked at the bare filename only, so a `.tgbl` opened in a clean browser session lost every placeholder, the canvas fell back to filename text instead of the bitmap, and a re-save propagated the missing bytes downstream.
- Both Upload buttons under "Image Settings" (static value picker and dynamic placeholder upload) now have a visible border + tertiary background so they look like buttons at rest. They previously used the bare `tg-btn` class which is fully transparent until hover.
