# Spec 010 — UI Text Field

## Status

Draft. Creation-popup and mode toggle (static/dynamic) introduced in design 2026-04-18 §8; full spec comes with the Phase 4 implementation plan.

## Summary

The UI text field allows designers to place text placeholders on the canvas by drawing a rectangle after clicking "Add Text" in the toolbar. Once placed, the right panel exposes all text field properties: JSON key (auto-prefixed with `texts.`), group assignment, required/optional toggle, placeholder text, font configuration, overflow behaviour, alignment, and a live preview input. The text field's height is computed from `maxRows * fontSize * lineHeight` and auto-adjusts when any of those values change -- only width is user-controlled.

## Requirements

- [ ] REQ-001: Clicking "Add Text" in the toolbar enters a draw mode where the user draws a rectangle on the canvas by clicking and dragging
- [ ] REQ-002: After drawing, a new text field is created at the drawn position with the drawn width; height is computed from default values (`maxRows * fontSize * lineHeight`)
- [ ] REQ-003: The right panel displays all editable properties for the selected text field
- [ ] REQ-004: JSON key input is auto-prefixed with `texts.` -- the user enters only the suffix (e.g. typing "name" produces `texts.name`)
- [ ] REQ-005: Group dropdown lists all existing groups from the template plus an option to create a new group
- [ ] REQ-006: Required/Optional toggle sets the `required` property on the field definition
- [ ] REQ-007: Placeholder text input -- the entered text is displayed on the canvas when no preview value is set
- [ ] REQ-008: Max rows input (number) -- changing this value auto-adjusts the field's height on the canvas
- [ ] REQ-009: Line height input (number, default 1.2) -- changing this value auto-adjusts the field's height on the canvas
- [ ] REQ-010: Font family dropdown -- includes PDFKit built-in fonts (Helvetica, Times-Roman, Courier, etc.) and any custom fonts uploaded to the template
- [ ] REQ-011: Font size input (number, in pt) -- changing this value auto-adjusts the field's height on the canvas
- [ ] REQ-012: Font size mode toggle: Fixed or Dynamic. When Dynamic is selected, a "Min font size" input appears.
- [ ] REQ-013: Overflow mode selector: "Dynamic Font Size" or "Truncate"
- [ ] REQ-014: Font weight selector: Normal / Bold
- [ ] REQ-015: Font style selector: Normal / Italic
- [ ] REQ-016: Text decoration selector: None / Underline
- [ ] REQ-017: Text color picker for the `color` property
- [ ] REQ-018: Horizontal alignment selector: Left / Center / Right
- [ ] REQ-019: Vertical alignment selector: Top / Middle / Bottom
- [ ] REQ-020: Preview input -- user types a value that is rendered live on the canvas in place of the placeholder text
- [ ] REQ-021: Field height formula: `height = maxRows * fontSize * lineHeight` -- height is always computed, never manually editable
- [ ] REQ-022: Field width is user-defined only -- set during initial draw and adjustable via resize handles (horizontal only)

## Behaviour

### Happy path

1. User clicks "Add Text" in the toolbar. Cursor changes to a crosshair indicating draw mode.
2. User clicks and drags on the canvas to draw a rectangle. On mouse release, the text field is created.
3. The field appears on the canvas with placeholder text (default: the JSON key suffix, e.g. "name").
4. The right panel populates with all text field properties, pre-filled with defaults: fontSize 12, lineHeight 1.2, maxRows 1, fontFamily "Helvetica", align "left", verticalAlign "top", color "#000000", fontWeight "normal", fontStyle "normal", textDecoration "none", overflowMode "dynamic_font", required true.
5. User edits the JSON key suffix to "student_name". The field's `jsonKey` becomes `texts.student_name`.
6. User changes maxRows to 3. The field's height on the canvas updates to `3 * 12 * 1.2 = 43.2 pt`.
7. User changes fontSize to 16. The field's height updates to `3 * 16 * 1.2 = 57.6 pt`.
8. User types "John Doe" into the preview input. The canvas shows "John Doe" rendered in the field.

### Edge cases

- User draws a very narrow rectangle (e.g. 5 pt wide): field is created but text will likely overflow. This is valid -- the preview should reflect actual rendering behaviour.
- User draws a very tall rectangle: height is overridden by the computed value from `maxRows * fontSize * lineHeight`. The drawn height is ignored; only the drawn width is used.
- JSON key suffix is empty: show validation error, field is not valid until a key is provided
- JSON key suffix contains dots or spaces: strip or reject invalid characters; only allow alphanumeric and underscores
- JSON key suffix duplicates an existing field's key: show a warning/error indicating the key must be unique
- Changing font family to a custom font: if the custom font is bold-only or italic-only, warn or disable unavailable weight/style options
- Font size set to 0 or negative: enforce minimum of 1 pt
- Max rows set to 0 or negative: enforce minimum of 1
- Line height set to 0 or negative: enforce minimum of 0.5
- Preview input with text longer than what fits: canvas rendering shows the overflow behaviour (dynamic font shrink or truncation) live

### Error conditions

- Attempting to add a text field before a background image is uploaded: blocked with a message (dependent on spec 009 canvas requirements)
- Invalid JSON key characters: input is sanitized or rejected with inline validation message

## Input / Output

### Field Definition (stored in manifest)

```ts
interface TextFieldDefinition {
  id: string
  type: 'text'
  groupId: string | null
  required: boolean
  jsonKey: string // e.g. "texts.student_name"
  placeholder: string | null
  x: number
  y: number
  width: number
  height: number // computed: maxRows * fontSize * lineHeight
  zIndex: number
  style: TextFieldStyle
}

interface TextFieldStyle {
  fontId: string | null // null = use fontFamily built-in
  fontFamily: string // e.g. "Helvetica"
  fontSize: number
  fontSizeDynamic: boolean
  fontSizeMin: number // only relevant when fontSizeDynamic is true
  lineHeight: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline'
  color: string // hex colour, e.g. "#000000"
  align: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  maxRows: number
  overflowMode: 'dynamic_font' | 'truncate'
  snapToGrid: boolean
}
```

### Right Panel Props Component

```ts
interface TextFieldPropsPanel {
  field: TextFieldDefinition
  groups: Group[]
  fonts: FontDefinition[]
  onUpdate(updates: Partial<TextFieldDefinition>): void
  onStyleUpdate(updates: Partial<TextFieldStyle>): void
}
```

## Acceptance Criteria

- [ ] AC-001: Clicking "Add Text" enters draw mode; drawing a rectangle on the canvas creates a text field at that position
- [ ] AC-002: The created field's height equals `maxRows * fontSize * lineHeight` regardless of the drawn rectangle's height
- [ ] AC-003: The created field's width matches the drawn rectangle's width
- [ ] AC-004: The right panel displays all text field properties when a text field is selected
- [ ] AC-005: Changing maxRows from 1 to 3 updates the field height on the canvas (e.g. `3 * 12 * 1.2 = 43.2 pt` at default settings)
- [ ] AC-006: Changing fontSize updates the field height on the canvas
- [ ] AC-007: Changing lineHeight updates the field height on the canvas
- [ ] AC-008: JSON key is auto-prefixed with `texts.` -- entering "name" in the input produces `jsonKey: "texts.name"`
- [ ] AC-009: Duplicate JSON keys are flagged with a validation error
- [ ] AC-010: The font family dropdown includes PDFKit built-in fonts and any custom fonts from the template
- [ ] AC-011: Selecting "Dynamic" font size mode reveals the min font size input
- [ ] AC-012: Selecting "Fixed" font size mode hides the min font size input
- [ ] AC-013: Typing text in the preview input renders that text live on the canvas field
- [ ] AC-014: Changing text color via the color picker updates the canvas rendering in real-time
- [ ] AC-015: Changing alignment (left/center/right) updates the canvas rendering in real-time
- [ ] AC-016: The field's width is adjustable via horizontal resize handles on the canvas
- [ ] AC-017: The field's height cannot be changed via resize handles -- only via maxRows/fontSize/lineHeight
- [ ] AC-018: All property changes are reflected in the Zustand `templateStore` and persist in the manifest on save

## Dependencies

- Spec 002 — Template Schema (text field style schema, field definition structure)
- Spec 003 — Text Rendering (overflow modes, dynamic font behaviour, text wrapping rules)
- Spec 009 — UI Canvas (canvas infrastructure, selection, resize handles, draw mode)

## Notes

- The right panel component for text fields lives at `packages/ui/src/components/RightPanel/TextFieldProps.tsx`.
- Built-in PDFKit fonts to include in the dropdown: Helvetica, Helvetica-Bold, Helvetica-Oblique, Helvetica-BoldOblique, Times-Roman, Times-Bold, Times-Italic, Times-BoldItalic, Courier, Courier-Bold, Courier-Oblique, Courier-BoldOblique, Symbol, ZapfDingbats.
- Open question: should the height auto-adjust also apply when the user resizes vertically on the canvas? Current decision: vertical resize handles are disabled for text fields; height is purely computed.
- Open question: should the preview input support rich text (e.g. newlines via Shift+Enter) to test multi-line rendering? Leaning yes -- allow newlines in preview input.
- Consider debouncing right-panel property changes to avoid excessive canvas re-renders during rapid typing.
