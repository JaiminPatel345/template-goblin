---
'template-goblin': minor
'template-goblin-ui': minor
---

Single-source JSON sync, orphaned-asset sweep, and editor bug fixes.

**template-goblin-ui**

- The JSON panel is now a pure projection of the fields (key = `jsonKey`, value = placeholder) with per-value write-through: editing a value updates that field's placeholder — the same state the canvas and sidebar render — so the three surfaces can no longer drift. The old "pin" (`previewJsonText`), Max Fill, Format, and Reset are gone; new fields, page switches, and static↔dynamic flips always appear immediately. Dynamic text with no placeholder previews as its own jsonKey (#174).
- Image bytes now follow a field across dynamic↔static mode flips, and the properties-panel static upload stores into the pool the renderer reads — fixes `MISSING_ASSET` ("archive does not contain that file") after switching a field to static.
- Friendly error handling: engine errors are translated to plain-language, actionable messages; a React error boundary and global error/unhandledrejection handlers show a calm "Internal error" notice (full details in the console) instead of raw internals or a white screen.
- One drag/resize gesture is now one undo step (was three). The Preview dialog's required-field gate and image-upload rows cover header/footer band fields. The field-creation popup's broken layout (unstyled header/rows) is fixed.

**template-goblin**

- `saveTemplate` sweeps orphaned image assets: only placeholder/static images referenced by the manifest's fields (body + bands) are written into the `.tgbl`, so archives no longer bloat with bytes from deleted, replaced, or mode-flipped fields.
- New export `collectReferencedImageAssets(manifest)` (also available via the browser-safe `template-goblin/assetRefs` subpath) returns the referenced image filenames per pool.
