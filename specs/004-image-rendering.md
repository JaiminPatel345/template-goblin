# Spec 004 — Image Rendering

## Status

Draft

## Summary

Defines how image fields are rendered within their bounding rectangles on the PDF canvas. Covers the three fit modes (`fill`, `contain`, `cover`), input formats (Buffer and base64 string), and the guarantee that images never render outside their bounding rectangle.

## Requirements

- [ ] REQ-001: Implement `fit: "fill"` — stretch the image to exactly match the bounding rectangle dimensions, disregarding aspect ratio.
- [ ] REQ-002: Implement `fit: "contain"` — scale the image to fit entirely within the bounding rectangle while preserving aspect ratio; empty space may remain.
- [ ] REQ-003: Implement `fit: "cover"` — scale the image to cover the entire bounding rectangle while preserving aspect ratio; excess content is cropped.
- [ ] REQ-004: Accept image data as a `Buffer` (binary).
- [ ] REQ-005: Accept image data as a base64-encoded string, decoding it to binary before rendering.
- [ ] REQ-006: Enforce the bounding rectangle — no image pixels may appear outside `{x, y, width, height}`.

## Behaviour

### Bounding Rectangle

Every image field defines a rectangle `{x, y, width, height}`. The image is rendered strictly within this rectangle regardless of fit mode.

### Fit Modes

#### `fill`

1. Scale the image width to match the bounding rect width.
2. Scale the image height to match the bounding rect height.
3. The image's original aspect ratio is ignored; distortion may occur.
4. The image fills the entire bounding rectangle with no empty space and no cropping.

#### `contain`

1. Calculate the scale factor: `scale = min(rectWidth / imgWidth, rectHeight / imgHeight)`.
2. Apply the scale factor to both dimensions, preserving the original aspect ratio.
3. Centre the scaled image within the bounding rectangle.
4. Empty space (letterboxing/pillarboxing) may appear on two sides.

#### `cover`

1. Calculate the scale factor: `scale = max(rectWidth / imgWidth, rectHeight / imgHeight)`.
2. Apply the scale factor to both dimensions, preserving the original aspect ratio.
3. Centre the scaled image within the bounding rectangle.
4. Clip/crop any portion of the image that extends beyond the bounding rectangle.

### Input Formats

#### Buffer

Binary image data passed directly. The engine detects the image format (PNG, JPEG) from magic bytes and embeds accordingly.

#### Base64 String

A base64-encoded string representing the image binary. The engine:

1. Strips any data URI prefix (e.g., `data:image/png;base64,`) if present.
2. Decodes the base64 payload to a binary buffer.
3. Proceeds as with Buffer input.

### Edge Cases

- Image is the exact same size as the bounding rectangle: all three fit modes produce the same result (no scaling needed).
- Image has a 1:1 aspect ratio and the bounding rect is square: `contain` and `cover` produce the same result.
- Zero-dimension image (width or height is 0): skip rendering, log a warning.
- Corrupt or unreadable image data: throw an error rather than rendering a broken image.
- Very large image: scale down per the fit mode; no special memory handling is defined at this level (implementation concern).

### Error Conditions

- Invalid image data (not a recognized format): throw `InvalidImageError`.
- Base64 string that fails to decode: throw `Base64DecodeError`.
- Bounding rect with zero or negative width/height: throw `InvalidFieldError`.

## Input / Output

```typescript
interface ImageRenderInput {
  imageData: Buffer | string // Buffer or base64-encoded string
  x: number
  y: number
  width: number
  height: number
  style: {
    fit: 'fill' | 'contain' | 'cover'
    placeholderFilename?: string
  }
}

interface ImageRenderOutput {
  renderedRect: { x: number; y: number; width: number; height: number }
  scaledWidth: number
  scaledHeight: number
  cropped: boolean // true if cover mode cropped the image
}

function renderImage(input: ImageRenderInput, ctx: PDFContext): ImageRenderOutput
```

## Acceptance Criteria

- [ ] AC-001: `fit: "fill"` stretches a 100x50 image to fill a 200x200 bounding rect, producing a rendered size of 200x200.
- [ ] AC-002: `fit: "contain"` scales a 400x200 image into a 200x200 bounding rect to 200x100, centred vertically with 50pt empty space above and below.
- [ ] AC-003: `fit: "cover"` scales a 400x200 image into a 200x200 bounding rect to 400x200 (scaled to cover), then crops to 200x200, centred.
- [ ] AC-004: A `Buffer` containing valid PNG data renders successfully.
- [ ] AC-005: A base64 string (with or without data URI prefix) is decoded and renders identically to the equivalent Buffer input.
- [ ] AC-006: No image pixel appears outside the bounding rectangle for any fit mode.
- [ ] AC-007: An invalid image buffer throws `InvalidImageError`.
- [ ] AC-008: A malformed base64 string throws `Base64DecodeError`.
- [ ] AC-009: A bounding rect with width or height of 0 throws `InvalidFieldError`.

## Dependencies

- Spec 002 — Template Schema (image field style schema definition).

## Notes

- Supported image formats are PNG and JPEG. Future specs may add SVG or WebP support.
- The `placeholderFilename` in the style refers to a file in the `placeholders/` directory of the `.tgbl` archive (Spec 001). When no runtime image data is provided, the placeholder is rendered instead.
- Open question: should `contain` mode allow configurable alignment (e.g., top-left instead of centre)? Current decision is always centre.
