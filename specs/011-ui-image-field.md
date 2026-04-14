# Spec 011 — UI Image Field

## Status

Draft

## Summary

The UI image field allows designers to place image placeholders on the canvas by drawing a rectangle after clicking "Add Image" in the toolbar. Once placed, the right panel exposes image field properties: JSON key (auto-prefixed with `images.`), group assignment, required/optional toggle, placeholder image upload, and fit mode (Fill/Contain/Cover). Placeholder images uploaded by the designer are stored in the `placeholders/` folder within the `.tgbl` ZIP archive and displayed on the canvas as a visual reference during template design.

## Requirements

- [ ] REQ-001: Clicking "Add Image" in the toolbar enters a draw mode where the user draws a rectangle on the canvas by clicking and dragging
- [ ] REQ-002: After drawing, a new image field is created at the drawn position with the drawn width and height
- [ ] REQ-003: The right panel displays all editable properties for the selected image field
- [ ] REQ-004: JSON key input is auto-prefixed with `images.` -- the user enters only the suffix (e.g. typing "student_photo" produces `images.student_photo`)
- [ ] REQ-005: Group dropdown lists all existing groups from the template plus an option to create a new group
- [ ] REQ-006: Required/Optional toggle sets the `required` property on the field definition
- [ ] REQ-007: Placeholder image upload -- the designer can upload an image that is displayed on the canvas as a preview and stored in the `placeholders/` folder of the `.tgbl` ZIP
- [ ] REQ-008: Fit mode selector: Fill / Contain / Cover -- determines how the runtime image is scaled within the bounding rectangle
- [ ] REQ-009: The placeholder image is displayed on the canvas within the field's bounding rectangle using the selected fit mode
- [ ] REQ-010: Image field width and height are both user-defined and adjustable via resize handles on the canvas

## Behaviour

### Happy path

1. User clicks "Add Image" in the toolbar. Cursor changes to a crosshair indicating draw mode.
2. User clicks and drags on the canvas to draw a rectangle. On mouse release, the image field is created.
3. The field appears on the canvas as an empty bounding rectangle with a placeholder icon (e.g. a generic image icon) and the field's JSON key label.
4. The right panel populates with image field properties, pre-filled with defaults: required true, fit "contain", no placeholder image.
5. User edits the JSON key suffix to "student_photo". The field's `jsonKey` becomes `images.student_photo`.
6. User uploads a placeholder image via the right panel. The image is displayed on the canvas within the bounding rectangle using the selected fit mode.
7. User changes fit mode from "Contain" to "Cover". The canvas updates to show the placeholder image with cover scaling.
8. On save, the placeholder image is written to `placeholders/student_photo.png` (or appropriate extension) inside the `.tgbl` ZIP.

### Edge cases

- No placeholder image uploaded: canvas shows a generic placeholder icon (image outline) and the field's JSON key label
- Placeholder image is very large: compress the placeholder image before storing (similar to background image compression)
- Placeholder image aspect ratio differs significantly from the field rectangle: fit mode determines how the image is scaled (fill stretches, contain letterboxes, cover crops)
- User removes a previously uploaded placeholder image: field reverts to the generic placeholder icon
- User resizes the image field after uploading a placeholder: the placeholder re-renders with the new dimensions and the current fit mode
- JSON key suffix is empty: show validation error
- JSON key suffix duplicates an existing field's key: show a warning/error
- Multiple image fields referencing different placeholder images: each is stored separately in `placeholders/`

### Error conditions

- Attempting to add an image field before a background image is uploaded: blocked with a message (dependent on spec 009 canvas requirements)
- Uploaded placeholder image format is unsupported: show error listing supported formats (PNG, JPEG, WebP)
- Uploaded placeholder image is corrupted: show error message

## Input / Output

### Field Definition (stored in manifest)

```ts
interface ImageFieldDefinition {
  id: string
  type: 'image'
  groupId: string | null
  required: boolean
  jsonKey: string // e.g. "images.student_photo"
  placeholder: null // placeholder text not applicable for image fields
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  style: ImageFieldStyle
}

interface ImageFieldStyle {
  fit: 'fill' | 'contain' | 'cover'
  placeholderFilename: string | null // e.g. "placeholders/student_photo.png" or null if not set
}
```

### Right Panel Props Component

```ts
interface ImageFieldPropsPanel {
  field: ImageFieldDefinition
  groups: Group[]
  placeholderImage: Blob | null // currently loaded placeholder image for preview
  onUpdate(updates: Partial<ImageFieldDefinition>): void
  onStyleUpdate(updates: Partial<ImageFieldStyle>): void
  onPlaceholderUpload(file: File): void
  onPlaceholderRemove(): void
}
```

### Placeholder Storage

```ts
// Placeholder images stored in the templateStore for in-memory access
interface TemplateStore {
  // ... existing properties
  placeholders: Map<string, Blob> // filename -> image blob (e.g. "placeholders/student_photo.png" -> Blob)
}
```

## Acceptance Criteria

- [ ] AC-001: Clicking "Add Image" enters draw mode; drawing a rectangle on the canvas creates an image field at that position with the drawn dimensions
- [ ] AC-002: The right panel displays all image field properties when an image field is selected
- [ ] AC-003: JSON key is auto-prefixed with `images.` -- entering "student_photo" produces `jsonKey: "images.student_photo"`
- [ ] AC-004: Duplicate JSON keys are flagged with a validation error
- [ ] AC-005: Uploading a placeholder image displays it on the canvas within the field's bounding rectangle
- [ ] AC-006: The placeholder image renders on the canvas using the selected fit mode (Fill stretches, Contain preserves aspect ratio with possible gaps, Cover preserves aspect ratio with possible cropping)
- [ ] AC-007: Changing the fit mode updates the placeholder image rendering on the canvas in real-time
- [ ] AC-008: The field's width and height are both adjustable via resize handles on the canvas
- [ ] AC-009: An image field with no placeholder image shows a generic image icon and the JSON key label
- [ ] AC-010: Removing a placeholder image reverts the canvas display to the generic icon
- [ ] AC-011: The placeholder image is stored in the `placeholders/` folder of the `.tgbl` ZIP on save, with the filename matching the field's key (e.g. `placeholders/student_photo.png`)
- [ ] AC-012: The `style.placeholderFilename` in the manifest correctly references the stored placeholder path
- [ ] AC-013: All property changes are reflected in the Zustand `templateStore` and persist in the manifest on save

## Dependencies

- Spec 002 — Template Schema (image field style schema, field definition structure)
- Spec 004 — Image Rendering (fit modes: fill, contain, cover)
- Spec 009 — UI Canvas (canvas infrastructure, selection, resize handles, draw mode)

## Notes

- The right panel component for image fields lives at `packages/ui/src/components/RightPanel/ImageFieldProps.tsx`.
- Placeholder filename convention: use the JSON key suffix as the filename with the original file extension preserved. For example, if the field key is `images.student_photo` and the uploaded file is `photo.jpg`, store as `placeholders/student_photo.jpg`.
- Open question: should we enforce a maximum file size for placeholder images? Consider a 5 MB limit with compression applied automatically above a threshold.
- Open question: should the canvas preview of fit modes be pixel-perfect to match the PDF output, or is an approximation acceptable? Leaning toward approximation for performance, with the PDF preview (spec 015) providing the authoritative rendering.
- Unlike text fields, image fields allow both horizontal and vertical resizing since there is no computed height constraint.
