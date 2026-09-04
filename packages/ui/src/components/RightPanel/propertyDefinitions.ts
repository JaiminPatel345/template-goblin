/**
 * Style property definitions for condition-based styling (#43).
 *
 * Provides human-readable names and categories for all inspectable style
 * properties across text, image, and table fields.
 */
import type { FieldType } from '@template-goblin/types'

export interface PropertyMeta {
  id: string
  label: string
  category: string
}

const TEXT_PROPERTIES: PropertyMeta[] = [
  { id: 'fontFamily', label: 'Font Family', category: 'Typography' },
  { id: 'fontSize', label: 'Font Size', category: 'Typography' },
  { id: 'color', label: 'Text Color', category: 'Typography' },
  { id: 'backgroundColor', label: 'Background Color', category: 'Typography' },
  { id: 'fontWeight', label: 'Font Weight (Bold)', category: 'Typography' },
  { id: 'fontStyle', label: 'Font Style (Italic)', category: 'Typography' },
  {
    id: 'textDecoration',
    label: 'Text Decoration (Underline / Strikethrough)',
    category: 'Typography',
  },
  { id: 'overflowMode', label: 'Overflow Mode', category: 'Typography' },
  { id: 'fontSizeMin', label: 'Minimum Font Size', category: 'Typography' },
  { id: 'align', label: 'Horizontal Alignment', category: 'Alignment' },
  { id: 'verticalAlign', label: 'Vertical Alignment', category: 'Alignment' },
  { id: 'maxRows', label: 'Max Rows', category: 'Layout' },
  { id: 'lineHeight', label: 'Line Height', category: 'Layout' },
  { id: 'trim', label: 'Trim Whitespace', category: 'Layout' },
]

const IMAGE_PROPERTIES: PropertyMeta[] = [{ id: 'fit', label: 'Fit Mode', category: 'Image' }]

const TABLE_PROPERTIES: PropertyMeta[] = [
  { id: 'headerFontFamily', label: 'Header Font Family', category: 'Header' },
  { id: 'headerFontSize', label: 'Header Font Size', category: 'Header' },
  { id: 'headerTextColor', label: 'Header Text Color', category: 'Header' },
  { id: 'headerBgColor', label: 'Header Background Color', category: 'Header' },
  { id: 'headerAlign', label: 'Header Alignment', category: 'Header' },
  { id: 'rowFontFamily', label: 'Row Font Family', category: 'Row' },
  { id: 'rowFontSize', label: 'Row Font Size', category: 'Row' },
  { id: 'rowTextColor', label: 'Row Text Color', category: 'Row' },
  { id: 'rowBgColor', label: 'Row Background Color', category: 'Row' },
  { id: 'rowAlign', label: 'Row Alignment', category: 'Row' },
  { id: 'tableBorderWidth', label: 'Table Border Width', category: 'Border' },
  { id: 'tableBorderColor', label: 'Table Border Color', category: 'Border' },
  { id: 'tableOverflowMode', label: 'Table Overflow Mode', category: 'Cell' },
]

/**
 * Returns the list of inspectable style properties for the given field type.
 */
export function getAvailableProperties(fieldType: FieldType): PropertyMeta[] {
  switch (fieldType) {
    case 'text':
      return TEXT_PROPERTIES
    case 'image':
      return IMAGE_PROPERTIES
    case 'table':
      return TABLE_PROPERTIES
    default:
      return []
  }
}
