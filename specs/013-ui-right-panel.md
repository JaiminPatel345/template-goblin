# Spec 013 — UI Right Panel

## Status

Draft. Double-click activation, top-level mode toggle (static/dynamic), and parity with the creation popup introduced in design 2026-04-18 §8.2; full spec comes with the Phase 5 implementation plan.

## Summary

Defines the right-side properties panel in the template builder UI. When a field is double-clicked on the canvas, this panel displays and allows editing of all properties specific to that field type (text, image, or table). When no field is selected, the panel shows an empty-state message. All property changes are reflected immediately on the canvas without requiring an explicit save or apply action.

## Requirements

- [ ] REQ-001: Display a contextual properties panel on the right side of the UI that updates based on the currently selected canvas field.
- [ ] REQ-002: When no field is selected, show the message "Select a field to edit properties" as an empty state.
- [ ] REQ-003: For text fields, expose all text style properties: font family, font size, font weight, font style (italic), text color, text alignment (left/center/right/justify), line height, letter spacing, text overflow behaviour (clip, ellipsis, wrap), and text decoration (underline, strikethrough).
- [ ] REQ-004: For image fields, expose fit mode (contain, cover, stretch, none) and a placeholder image upload control.
- [ ] REQ-005: For table fields, expose column definitions (add/remove/reorder columns), header style properties, row style properties, and individual cell style overrides.
- [ ] REQ-006: For all field types, expose common properties: JSON key binding, group assignment (dropdown of existing groups + create new), required toggle, and placeholder value.
- [ ] REQ-007: Property changes MUST be reflected immediately on the canvas (no "Apply" button).
- [ ] REQ-008: The panel MUST be scrollable when its content exceeds the viewport height.
- [ ] REQ-009: Property inputs MUST validate values inline (e.g., font size must be a positive number, color must be a valid hex/rgba value) and show validation errors adjacent to the offending input.
- [ ] REQ-010: The panel MUST update its contents when the user selects a different field on the canvas without requiring manual refresh.

## Behaviour

### Happy Path

1. User clicks a text field on the canvas.
2. The right panel populates with the text field's current properties: font family, font size, color, alignment, overflow, JSON key, group, required toggle, and placeholder.
3. User changes font size from 14 to 18.
4. The canvas immediately re-renders the text field at the new size.
5. User clicks an image field on the canvas.
6. The right panel switches to show image-specific properties: fit mode dropdown and placeholder upload.
7. User selects a different fit mode; the canvas preview updates immediately.

### Edge Cases

- Selecting a field while another field's property is mid-edit (e.g., typing in a text input) should commit the in-progress value before switching context.
- If a font family referenced by a text field is not loaded, the panel should show the font name with a warning indicator and fall back to displaying available fonts.
- For table fields with zero columns defined, the panel should show an "Add Column" prompt rather than an empty column list.
- Rapidly changing a numeric property (e.g., dragging a font-size slider) should debounce canvas updates to avoid performance degradation (target: no more than one canvas re-render per 16ms).
- Group assignment dropdown should include a "None" option to unassign a field from its current group.

### Error Conditions

- Invalid font size (zero, negative, non-numeric): show inline validation error "Font size must be a positive number", do not apply the change to canvas.
- Invalid color value: show inline validation error "Invalid color format", do not apply the change.
- Placeholder image upload exceeds maximum size (5 MB): show error "Image must be under 5 MB".
- Placeholder image is not a supported format (PNG, JPEG, SVG): show error "Unsupported image format. Use PNG, JPEG, or SVG."
- JSON key contains invalid characters (spaces, special characters other than dots and underscores): show inline validation error "JSON key may only contain letters, numbers, dots, and underscores".

## Input / Output

```typescript
// Field type discriminator
type FieldType = 'text' | 'image' | 'table'

// Common properties shared by all fields
// Shape superseded by source: FieldSource<V> per spec 023; retained for historical reference and to be rewritten in the Phase 5 plan.
interface CommonFieldProperties {
  jsonKey: string
  group: string | null
  required: boolean
  placeholder: string
}

// Text-specific properties
interface TextFieldProperties extends CommonFieldProperties {
  type: 'text'
  fontFamily: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  color: string // hex or rgba
  alignment: 'left' | 'center' | 'right' | 'justify'
  lineHeight: number
  letterSpacing: number
  overflow: 'clip' | 'ellipsis' | 'wrap'
  textDecoration: 'none' | 'underline' | 'strikethrough'
}

// Image-specific properties
interface ImageFieldProperties extends CommonFieldProperties {
  type: 'image'
  fitMode: 'contain' | 'cover' | 'stretch' | 'none'
  placeholderImage: Blob | null
}

// Table-specific properties
interface TableFieldProperties extends CommonFieldProperties {
  type: 'table'
  columns: TableColumnDefinition[]
  headerStyle: TableSectionStyle
  rowStyle: TableSectionStyle
}

interface TableColumnDefinition {
  key: string
  label: string
  width: number // percentage or fixed px
  cellStyle?: Partial<TextFieldProperties>
}

interface TableSectionStyle {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  padding: number
  fontSize: number
  fontWeight: 'normal' | 'bold'
  color: string
}

// React component props
interface RightPanelProps {
  selectedField: TextFieldProperties | ImageFieldProperties | TableFieldProperties | null
  onPropertyChange: (fieldId: string, property: string, value: unknown) => void
  availableFonts: string[]
  availableGroups: string[]
  onCreateGroup: (name: string) => void
}
```

## Acceptance Criteria

- [ ] AC-001: Clicking a text field on the canvas causes the right panel to display all text style properties (font family, font size, font weight, font style, color, alignment, line height, letter spacing, overflow, text decoration).
- [ ] AC-002: Clicking an image field on the canvas causes the right panel to display fit mode and placeholder upload controls.
- [ ] AC-003: Double-clicking a table field on the canvas causes the right panel to display column definitions, header style, and row style controls.
- [ ] AC-004: All field types display the common properties section: JSON key, group assignment, required toggle, and placeholder.
- [ ] AC-005: When no field is selected, the panel displays "Select a field to edit properties".
- [ ] AC-006: Changing a property value in the panel is reflected on the canvas within one animation frame (16ms debounce).
- [ ] AC-007: Invalid property values (negative font size, malformed color) show inline validation errors and do not propagate to the canvas.
- [ ] AC-008: Switching between selected fields updates the panel contents to reflect the newly selected field's properties.
- [ ] AC-009: The panel is scrollable when content exceeds viewport height.
- [ ] AC-010: Uploading a placeholder image larger than 5 MB shows an error message and rejects the upload.

## Dependencies

- Spec 009 — UI Canvas (provides field selection events and canvas re-render triggers)
- Spec 010 — UI Text Field (defines text field data model and style properties)
- Spec 011 — UI Image Field (defines image field data model and fit modes)
- Spec 012 — UI Table Field (defines table field data model, column definitions, and section styles)

## Notes

- Open question: should the panel support multi-field selection and batch property editing (e.g., select three text fields and change their font size simultaneously)?
- Open question: should property sections be collapsible accordion-style to reduce scrolling for fields with many properties?
- The debounce strategy for rapid changes (e.g., slider-driven font size) should be validated during performance testing. If 16ms proves too aggressive, a 32ms or 50ms debounce may be acceptable.
