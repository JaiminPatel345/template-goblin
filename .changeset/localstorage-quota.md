---
'template-goblin-ui': patch
---

Fix `QuotaExceededError` when uploading a real-world image as a template background. The Zustand persist adapter used to serialise every image / font buffer into localStorage as base-64, duplicating bytes already stored in the matching `*DataUrl(s)` fields and trivially breaching the ~5 MB localStorage quota on the first real photo. The image buffers (`backgroundBuffer`, `pageBackgroundBuffers`, `staticImageBuffers`) are no longer written — they are reconstructed from their data-URL counterparts on rehydration so save-to-`.tgbl` and canvas rendering continue to see the ArrayBuffers they need. The setItem path also now catches storage failures and falls back to a minimal payload instead of throwing through Zustand. Closes #11.
