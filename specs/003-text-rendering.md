# Spec 003 — Text Rendering

## Status

Draft

## Summary

Defines how text fields are rendered within their bounding rectangles on the PDF canvas. Covers word wrapping, overflow handling (dynamic font shrinking and truncation with ellipsis), vertical alignment, and the relationship between `maxRows`, `fontSize`, and `lineHeight` in determining the bounding box height. The core invariant is that text NEVER renders outside its bounding rectangle. Text rendering consumes the resolved `string` value regardless of whether the field's `source` is static (`source.value`) or dynamic (looked up in `InputJSON.texts`) — see Spec 023 for the resolution algorithm.

## Requirements

- [ ] REQ-001: Enforce the bounding rectangle — no text pixels may appear outside `{x, y, width, height}` where `height = maxRows * fontSize * lineHeight`.
- [ ] REQ-002: Implement `overflowMode: "dynamic_font"` — start at `fontSize`, reduce by 1pt per iteration until text fits within the bounding rect, stopping at `fontSizeMin`. If text still overflows at `fontSizeMin`, truncate and append an ellipsis character (`...`).
- [ ] REQ-003: Implement `overflowMode: "truncate"` — render text at the fixed `fontSize`, cut off any content that exceeds the bounding rect, and append `...` to the last visible line.
- [ ] REQ-004: Support vertical alignment (`top`, `middle`, `bottom`) to position the text block within the bounding rectangle.
- [ ] REQ-005: Wrap text at word boundaries. If a single word is wider than the bounding rect width, break mid-word.
- [ ] REQ-006: Use `maxRows` to determine the maximum number of visible lines; derive the bounding rect height as `maxRows * fontSize * lineHeight`.

## Behaviour

### Bounding Rectangle

Every text field defines a rectangle `{x, y, width, height}`. The height is computed from the field's style:

```
height = maxRows * fontSize * lineHeight
```

All rendering is clipped to this rectangle. No glyph, descender, or decoration may extend beyond it.

### Word Wrapping

1. Split the input text into words (whitespace-delimited).
2. Accumulate words on the current line, measuring the width with the active font and size.
3. When the next word would exceed the remaining line width, move it to a new line.
4. If a single word is wider than the entire bounding rect width, break it at the character that would cause overflow and continue on the next line.
5. Continue until all text is placed or `maxRows` lines are filled.

### Overflow Mode: `dynamic_font`

1. Attempt to lay out text at the configured `fontSize`.
2. If the laid-out text exceeds `maxRows` lines, reduce `fontSize` by 1pt.
3. Repeat until text fits or `fontSize` reaches `fontSizeMin`.
4. If text still overflows at `fontSizeMin`, truncate the content at the last fully visible line and replace trailing characters with `...` such that the ellipsis fits within the line width.
5. Recalculate bounding rect height using the final effective `fontSize`: `maxRows * effectiveFontSize * lineHeight`.

### Overflow Mode: `truncate`

1. Lay out text at the fixed `fontSize`.
2. Render lines up to `maxRows`.
3. If there is remaining text beyond `maxRows` lines, the last visible line is truncated and `...` is appended. The ellipsis must fit within the line width — remove trailing characters as needed.

### Vertical Alignment

After determining the rendered text block height (number of actual lines _ effective fontSize _ lineHeight):

- `top`: text block starts at `y`.
- `middle`: text block starts at `y + (boundingHeight - textBlockHeight) / 2`.
- `bottom`: text block starts at `y + (boundingHeight - textBlockHeight)`.

### Edge Cases

- Empty string input: render nothing; vertical alignment still applies (zero-height text block positions at top/middle/bottom equivalently).
- `maxRows` is 1 and text is long: single-line truncation with ellipsis.
- `fontSizeMin` equals `fontSize`: dynamic mode has no room to shrink; behaves like truncate.
- Text contains only whitespace: treat as empty after trimming.
- Very long word (e.g., URL) wider than the bounding rect: mid-word break applies.

### Error Conditions

- `maxRows` less than 1: throw `InvalidFieldError`.
- `fontSize` less than `fontSizeMin`: throw `InvalidFieldError`.
- `fontSizeMin` less than 1: throw `InvalidFieldError`.

## Input / Output

```typescript
interface TextRenderInput {
  text: string
  x: number
  y: number
  width: number
  style: {
    fontId: string
    fontFamily: string
    fontSize: number
    fontSizeDynamic: boolean
    fontSizeMin: number
    lineHeight: number
    fontWeight: 'normal' | 'bold'
    fontStyle: 'normal' | 'italic'
    textDecoration: 'none' | 'underline' | 'line-through'
    color: string
    align: 'left' | 'center' | 'right'
    verticalAlign: 'top' | 'middle' | 'bottom'
    maxRows: number
    overflowMode: 'truncate' | 'dynamic_font'
  }
}

interface TextRenderOutput {
  lines: string[] // final lines after wrapping and truncation
  effectiveFontSize: number // fontSize actually used (may be reduced in dynamic mode)
  boundingRect: { x: number; y: number; width: number; height: number }
  truncated: boolean // true if ellipsis was applied
}

function renderText(input: TextRenderInput, ctx: PDFContext): TextRenderOutput
```

## Acceptance Criteria

- [ ] AC-001: Text rendered with `maxRows: 3`, `fontSize: 12`, `lineHeight: 1.2` produces a bounding rect height of exactly `43.2` (3 _ 12 _ 1.2).
- [ ] AC-002: In `dynamic_font` mode, when text overflows at `fontSize: 16`, the engine reduces to a smaller size that fits, down to `fontSizeMin`.
- [ ] AC-003: In `dynamic_font` mode, when text still overflows at `fontSizeMin`, the last line ends with `...`.
- [ ] AC-004: In `truncate` mode, excess lines beyond `maxRows` are dropped and the last visible line ends with `...`.
- [ ] AC-005: `verticalAlign: "middle"` centres the text block vertically within the bounding rect.
- [ ] AC-006: `verticalAlign: "bottom"` aligns the text block to the bottom edge of the bounding rect.
- [ ] AC-007: A single word wider than the bounding rect width is broken mid-word across lines.
- [ ] AC-008: No rendered glyph extends outside the bounding rectangle under any combination of inputs.
- [ ] AC-009: An empty string input produces zero rendered lines and no error.
- [ ] AC-010: `maxRows < 1` throws `InvalidFieldError`.

## Dependencies

- Spec 002 — Template Schema (text field style schema definition).

## Notes

- The ellipsis character used is the three-dot ASCII sequence `...` (U+002E x3), not the single Unicode ellipsis `...` (U+2026). This avoids font coverage issues.
- Open question: should `lineHeight` be a multiplier (current design) or an absolute point value? Current decision is multiplier.
- Font metrics (ascender, descender, cap height) may affect precise vertical positioning. Implementation should use the font's metrics for accurate baseline calculation.
