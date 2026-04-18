import type { FieldSource } from './source.js'

/** Page size presets supported by the template */
export type PageSize = 'custom' | 'A4' | 'A3' | 'Letter' | 'Legal'

/** Field types available in a template */
export type FieldType = 'text' | 'image' | 'table'

/** Text alignment options */
export type TextAlign = 'left' | 'center' | 'right'

/** Vertical alignment options */
export type VerticalAlign = 'top' | 'middle' | 'bottom'

/** Font weight options */
export type FontWeight = 'normal' | 'bold'

/** Font style options */
export type FontStyle = 'normal' | 'italic'

/** Text decoration options */
export type TextDecoration = 'none' | 'underline' | 'line-through'

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

/**
 * Shared cell style used by header, row, odd/even rows, and per-column overrides
 * in a table field. Every property is required at the top-level slots
 * (`headerStyle`, `rowStyle`); `Partial<CellStyle>` is used at override slots
 * (odd/even row, per-column).
 */
export interface CellStyle {
  fontFamily: string
  fontSize: number
  fontWeight: FontWeight
  fontStyle: FontStyle
  textDecoration: TextDecoration
  color: string
  backgroundColor: string
  borderWidth: number
  borderColor: string
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
  align: TextAlign
  verticalAlign: VerticalAlign
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

/**
 * Image field style. The placeholder filename (previously `placeholderFilename`)
 * has moved to `source.placeholder.filename` on dynamic image fields.
 */
export interface ImageFieldStyle {
  fit: ImageFit
}

/** Column definition in a table field */
export interface TableColumn {
  key: string
  label: string
  width: number
  /** Body-cell override (null = inherit from row / odd-even / header styles). */
  style: Partial<CellStyle> | null
  /** Header-cell override (null = inherit from table-level headerStyle). */
  headerStyle: Partial<CellStyle> | null
}

/** Runtime-only style properties that govern cell rendering behaviour */
export interface TableCellRuntimeStyle {
  overflowMode: OverflowMode
}

/** Style properties for table fields */
export interface TableFieldStyle {
  maxRows: number
  maxColumns: number
  multiPage: boolean
  /** When false, the header row is skipped entirely at render time. */
  showHeader: boolean
  headerStyle: CellStyle
  rowStyle: CellStyle
  /** Applied to rows with odd 0-indexed position (rows 1, 3, 5...). */
  oddRowStyle: Partial<CellStyle> | null
  /** Applied to rows with even 0-indexed position (rows 0, 2, 4...). */
  evenRowStyle: Partial<CellStyle> | null
  cellStyle: TableCellRuntimeStyle
  columns: TableColumn[]
}

/** A single row in a table — column key -> cell string value. */
export type TableRow = Record<string, string>

/** Image source value shape — a filename inside the `.tgbl` archive. */
export interface ImageSourceValue {
  filename: string
}

/** Background type for a page */
export type PageBackgroundType = 'image' | 'color' | 'inherit'

/** A single page in a multi-page template */
export interface PageDefinition {
  id: string
  /** Page index (0-based) */
  index: number
  /** Background type: image, solid color, or inherit from previous page */
  backgroundType: PageBackgroundType
  /** Background color (hex) — used when backgroundType is 'color' */
  backgroundColor: string | null
  /** Background image filename in ZIP — used when backgroundType is 'image' */
  backgroundFilename: string | null
}

/** Common geometric and organizational properties shared by every field type. */
export interface FieldBase {
  id: string
  groupId: string | null
  /** Which page this field belongs to (null = page 0 default). */
  pageId: string | null
  label: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

/** A text field — static value is the literal rendered string. */
export interface TextField extends FieldBase {
  type: 'text'
  style: TextFieldStyle
  source: FieldSource<string>
}

/**
 * An image field. Static `source.value.filename` references a file in
 * `images/` inside the archive; dynamic `source.placeholder.filename`
 * references a file in `placeholders/` used only for canvas preview.
 */
export interface ImageField extends FieldBase {
  type: 'image'
  style: ImageFieldStyle
  source: FieldSource<ImageSourceValue>
}

/** A table field — static value is the baked-in row array. */
export interface TableField extends FieldBase {
  type: 'table'
  style: TableFieldStyle
  source: FieldSource<TableRow[]>
}

/** Discriminated union of all field variants stored in the manifest. */
export type FieldDefinition = TextField | ImageField | TableField

/** The complete template manifest stored as manifest.json inside .tgbl */
export interface TemplateManifest {
  version: string
  meta: TemplateMeta
  fonts: FontDefinition[]
  groups: GroupDefinition[]
  /** Pages in the template (at least one). */
  pages: PageDefinition[]
  fields: FieldDefinition[]
}
