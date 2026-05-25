---
'template-goblin-ui': minor
---

feat(preview): auto-inject placeholder base64 in JSON Preview + fix Render image type (#165)

The JSON Preview panel used to emit the bare placeholder filename
(or the literal `<base64-image-data>` for required-with-no-
placeholder) for every dynamic image field. Developers reading the
panel for the expected schema couldn't tell what the runtime image
bucket actually contained, and the Preview dialog opened with
the same too-thin shape.

`generateExampleJson` now accepts an optional
`imageDataUrls: Map<filename, dataUrl>`. When a dynamic image
field's placeholder is in the map, the emitted value is the data
URL's first 80 chars + a recognisable sentinel suffix
`...<placeholder>` so the panel reads as real image data without
flooding the textarea with multi-KB base64.

`JsonPreview` and `PreviewDialog` both pass the existing
`buildImageDataUrlMap(staticImageDataUrls, placeholderBuffers)`
result into the generator. The right-panel pin + the Preview
dialog now display the same shape.

`PreviewDialog.handleRender` does two things to make Render work
end-to-end:

- Seeds every dynamic image field with the FULL data URL from
  the same map (was previously seeding the raw ArrayBuffer and
  relying on the parsed.images overlay to overwrite with a
  filename string — fragile and broke once the truncated value
  was preserved).
- Skips parsed.images entries that end in the sentinel suffix so
  the user clicking Render without editing the JSON keeps the
  full placeholder data URL.

Tests:

- 8 new vitest cases in jsonGenerator.test.ts covering the
  truncation, the fallback-to-filename, the no-map case, the
  required-no-placeholder + non-required cases, and the
  `isPlaceholderImageSentinel` helper.
- e2e/issue-165-preview-image-base64.spec.ts seeds a dynamic
  image field with a placeholder bitmap and asserts the JSON
  Preview textarea contains `images.<key>` with a
  `data:image/png;base64,…` prefix and `...<placeholder>` suffix.

End-to-end verified in Chrome: JSON Preview shows the expected
truncated base64 for the seeded image field. The previous
'invalid data: expected Buffer / string, got object' error from
Render is gone — the data URL flows cleanly into core.

Closes #165.
