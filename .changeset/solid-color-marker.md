---
'template-goblin': minor
'template-goblin-ui': minor
---

Solid-colour image fields now store a colour value directly instead of
baking a 1×1 PNG asset (#81). Pre-fix, picking "solid colour" generated
a tiny PNG and rendered it through `fit: contain`, which produced a
square in the centre of any non-square rect. Now solid-colour fields
fill the entire rectangle regardless of aspect ratio, with no image
asset bundled in the `.tgbl`.

API additions:

- `ImageSourceValue` is now a discriminated union: `{ filename } |
{ color }`. Type guards `isImageFilenameValue` / `isImageColorValue`
  are exported.
- Dynamic input accepts a string marker
  `<STATICIMAGE_COLOR_#hex>` in `images.<key>` — the renderer paints
  the field's rect that colour. New helpers exported:
  `parseImageColorMarker`, `isImageColorMarker`, `makeImageColorMarker`.

UI:

- The properties panel for a solid-colour static image field shows a
  Color picker; the Fit Mode dropdown + Placeholder upload are hidden
  (irrelevant for solid fills).
- The field-creation popup's "Solid color" button no longer generates
  a 1×1 PNG; the colour is the value.
