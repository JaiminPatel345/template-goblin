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
  { id: 'rotation', label: 'Angle (°)', category: 'Transform' },
]

const IMAGE_PROPERTIES: PropertyMeta[] = [
  { id: 'fit', label: 'Fit Mode', category: 'Image' },
  { id: 'rotation', label: 'Angle (°)', category: 'Transform' },
]

const TABLE_PROPERTIES: PropertyMeta[] = [
  { id: 'maxRows', label: 'Max Rows', category: 'Table Settings' },
  { id: 'maxColumns', label: 'Max Columns', category: 'Table Settings' },
  { id: 'multiPage', label: 'Multi-Page', category: 'Table Settings' },
  { id: 'showHeader', label: 'Show Header', category: 'Table Settings' },
  { id: 'fitToContent', label: 'Fit to Content', category: 'Table Settings' },
  { id: 'headerFontFamily', label: 'Header Font Family', category: 'Header Style' },
  { id: 'headerFontSize', label: 'Header Font Size', category: 'Header Style' },
  { id: 'headerFontWeight', label: 'Header Font Weight (Bold)', category: 'Header Style' },
  { id: 'headerFontStyle', label: 'Header Font Style (Italic)', category: 'Header Style' },
  { id: 'headerTextDecoration', label: 'Header Text Decoration', category: 'Header Style' },
  { id: 'headerTextColor', label: 'Header Text Color', category: 'Header Style' },
  { id: 'headerBgColor', label: 'Header Background Color', category: 'Header Style' },
  { id: 'headerAlign', label: 'Header Alignment', category: 'Header Style' },
  { id: 'headerVerticalAlign', label: 'Header Vertical Alignment', category: 'Header Style' },
  { id: 'rowFontFamily', label: 'Row Font Family', category: 'Row Style' },
  { id: 'rowFontSize', label: 'Row Font Size', category: 'Row Style' },
  { id: 'rowFontWeight', label: 'Row Font Weight (Bold)', category: 'Row Style' },
  { id: 'rowFontStyle', label: 'Row Font Style (Italic)', category: 'Row Style' },
  { id: 'rowTextDecoration', label: 'Row Text Decoration', category: 'Row Style' },
  { id: 'rowTextColor', label: 'Row Text Color', category: 'Row Style' },
  { id: 'rowBgColor', label: 'Row Background Color', category: 'Row Style' },
  { id: 'rowAlign', label: 'Row Alignment', category: 'Row Style' },
  { id: 'rowVerticalAlign', label: 'Row Vertical Alignment', category: 'Row Style' },
  { id: 'tableBorderWidth', label: 'Table Border Width', category: 'Table Border' },
  { id: 'tableBorderColor', label: 'Table Border Color', category: 'Table Border' },
  { id: 'tableOverflowMode', label: 'Table Overflow Mode', category: 'Cell Style' },
  { id: 'cellBorderWidth', label: 'Cell Border Width', category: 'Cell Style' },
  { id: 'cellBorderColor', label: 'Cell Border Color', category: 'Cell Style' },
  { id: 'paddingTop', label: 'Cell Padding Top', category: 'Cell Style' },
  { id: 'paddingBottom', label: 'Cell Padding Bottom', category: 'Cell Style' },
  { id: 'paddingLeft', label: 'Cell Padding Left', category: 'Cell Style' },
  { id: 'paddingRight', label: 'Cell Padding Right', category: 'Cell Style' },
  { id: 'rotation', label: 'Angle (°)', category: 'Transform' },
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
