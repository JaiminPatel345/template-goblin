/** Page size presets supported by the template */
export type PageSize = 'custom' | 'A4' | 'A3' | 'Letter' | 'Legal'

/** Field types available in a template */
export type FieldType = 'text' | 'image' | 'loop'

/** Text alignment options */
export type TextAlign = 'left' | 'center' | 'right'

/** Vertical alignment options */
export type VerticalAlign = 'top' | 'middle' | 'bottom'

/** Font weight options */
export type FontWeight = 'normal' | 'bold'

/** Font style options */
export type FontStyle = 'normal' | 'italic'

/** Text decoration options */
export type TextDecoration = 'none' | 'underline'

/** Overflow handling mode */
export type OverflowMode = 'dynamic_font' | 'truncate'

/** Image fit mode */
export type ImageFit = 'fill' | 'contain' | 'cover'

/** Template metadata stored in manifest.json */
export interface TemplateMeta {
  name: string
  width: number
  height: number
  unit: 'pt'
  pageSize: PageSize
  locked: boolean
  maxPages: number
  createdAt: string
  updatedAt: string
}

/** Font definition in the manifest */
export interface FontDefinition {
  id: string
  name: string
  filename: string
}

/** Group definition for organizing fields */
export interface GroupDefinition {
  id: string
  name: string
}

/** Style properties for text fields */
export interface TextFieldStyle {
  fontId: string | null
  fontFamily: string
  fontSize: number
  fontSizeDynamic: boolean
  fontSizeMin: number
  lineHeight: number
  fontWeight: FontWeight
  fontStyle: FontStyle
  textDecoration: TextDecoration
  color: string
  align: TextAlign
  verticalAlign: VerticalAlign
  maxRows: number
  overflowMode: OverflowMode
  snapToGrid: boolean
}

/** Style properties for image fields */
export interface ImageFieldStyle {
  fit: ImageFit
  placeholderFilename: string | null
}

/** Style override for individual loop columns */
export interface LoopColumnStyle {
  fontWeight?: FontWeight
  fontSize?: number
  textDecoration?: TextDecoration
  color?: string
}

/** Column definition in a loop/table field */
export interface LoopColumn {
  key: string
  label: string
  width: number
  align: TextAlign
  style?: LoopColumnStyle
}

/** Header style for loop/table fields */
export interface HeaderStyle {
  fontFamily: string
  fontSize: number
  fontWeight: FontWeight
  align: TextAlign
  color: string
  backgroundColor: string
}

/** Row style for loop/table data rows */
export interface RowStyle {
  fontFamily: string
  fontSize: number
  fontWeight: FontWeight
  color: string
  overflowMode: OverflowMode
  fontSizeDynamic: boolean
  fontSizeMin: number
  lineHeight: number
}

/** Cell border and padding style */
export interface CellStyle {
  borderWidth: number
  borderColor: string
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
}

/** Style properties for loop/table fields */
export interface LoopFieldStyle {
  maxRows: number
  maxColumns: number
  multiPage: boolean
  headerStyle: HeaderStyle
  rowStyle: RowStyle
  cellStyle: CellStyle
  columns: LoopColumn[]
}

/** A field definition in the template manifest */
export interface FieldDefinition {
  id: string
  type: FieldType
  groupId: string | null
  required: boolean
  jsonKey: string
  placeholder: string | null
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  style: TextFieldStyle | ImageFieldStyle | LoopFieldStyle
}

/** The complete template manifest stored as manifest.json inside .tgbl */
export interface TemplateManifest {
  version: string
  meta: TemplateMeta
  fonts: FontDefinition[]
  groups: GroupDefinition[]
  fields: FieldDefinition[]
}
