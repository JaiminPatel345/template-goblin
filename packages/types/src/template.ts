import type { FieldSource } from './source.js'
import type { TableFieldStyle, TableRow } from './table.js'

export type { TableHeightMode } from './tableHeight.js'
export { resolveTableHeightMode } from './tableHeight.js'
export type {
  CellStyle,
  TableColumn,
  TableCellRuntimeStyle,
  TableFieldStyle,
  TableBorderStyle,
  TableRow,
} from './table.js'
export type {
  PageBandDivider,
  PageBandStyle,
  PageBand,
  PageNumberNumeralStyle,
  PageNumberPlacement,
  PageNumberAlign,
  PageNumberConfig,
  TemplateManifest,
} from './manifest.js'
import type { Hyperlink } from './hyperlink.js'

/** Page size presets supported by the template */
export type PageSize = 'custom' | 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal'

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
export interface LegacyGroupDefinition {
  id: string
  name: string
  type?: undefined
  style?: undefined
}

export interface TextGroupDefinition {
  id: string
  name: string
  type: 'text'
  style: TextFieldStyle
}

export interface ImageGroupDefinition {
  id: string
  name: string
  type: 'image'
  style: ImageFieldStyle
}

export interface TableGroupDefinition {
  id: string
  name: string
  type: 'table'
  style: TableFieldStyle
}

export type GroupDefinition =
  | LegacyGroupDefinition
  | TextGroupDefinition
  | ImageGroupDefinition
  | TableGroupDefinition

/**
 * Style properties for text fields.
 *
 * GH #91 — `overflowMode` is the single knob that controls behaviour
 * when content doesn't fit the rect. `'truncate'` cuts characters from
 * the end; `'dynamic_font'` shrinks `fontSize` down to `fontSizeMin`
 * before truncating. Pre-#91 there was an additional `fontSizeDynamic`
 * boolean — that field has been removed; the same intent is now
 * expressed by `overflowMode === 'dynamic_font'`.
 */
export interface TextFieldStyle {
  fontId: string | null
  fontFamily: string
  fontSize: number
  /** Floor for `overflowMode: 'dynamic_font'`. Ignored otherwise. */
  fontSizeMin: number
  lineHeight: number
  fontWeight: FontWeight
  fontStyle: FontStyle
  textDecoration: TextDecoration
  color: string
  /**
   * Text-box fill colour painted behind the glyphs (#167). `null` — or a
   * missing field on a legacy template saved before this existed — means a
   * transparent box, so nothing is painted. Optional (rather than required
   * `string | null`) to stay backward-compatible with templates serialised
   * before #167, mirroring how `FieldBase.rotation` was added in #172.
   * New fields seed it to `null` via `defaultTextStyle`.
   */
  backgroundColor?: string | null
  align: TextAlign
  verticalAlign: VerticalAlign
  maxRows: number
  overflowMode: OverflowMode
  snapToGrid: boolean
  /**
   * Strip leading and trailing whitespace before rendering text. Defaults to
   * `true` when `undefined` for backwards-compatibility (#20).
   */
  trim?: boolean
}

/**
 * Image field style. The placeholder filename (previously `placeholderFilename`)
 * has moved to `source.placeholder.filename` on dynamic image fields.
 */
export interface ImageFieldStyle {
  fit: ImageFit
}

/**
 * Image source value — what a field's `source.value` (static) or
 * `source.placeholder` (dynamic, canvas-time preview) actually points at.
 *
 * Two shapes:
 *   - `{ filename }` — a baked image asset stored inside the `.tgbl`
 *     archive (PNG/JPEG bytes). The renderer decodes and paints.
 *   - `{ color }` — a solid colour, painted as a filled rectangle (#81).
 *     No image bytes; the colour is the value. Hex (`#rgb` or `#rrggbb`).
 */
export type ImageSourceValue = ImageFilenameValue | ImageColorValue

export interface ImageFilenameValue {
  filename: string
}

export interface ImageColorValue {
  /** Hex colour — `#rgb` or `#rrggbb`. */
  color: string
}

/** Type guard for the image-asset variant of `ImageSourceValue`. */
export function isImageFilenameValue(v: ImageSourceValue): v is ImageFilenameValue {
  return 'filename' in v && typeof v.filename === 'string'
}

/** Type guard for the solid-colour variant of `ImageSourceValue`. */
export function isImageColorValue(v: ImageSourceValue): v is ImageColorValue {
  return 'color' in v && typeof v.color === 'string'
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
  /**
   * Per-page width in points. When omitted, callers must fall back to
   * `meta.width`. Older templates saved before per-page sizing don't carry
   * this field — `getPageSize(page, meta)` is the canonical resolver.
   */
  width?: number
  /** Per-page height in points (see `width`). */
  height?: number
  /** Page size preset. `'custom'` indicates `width`/`height` are user-chosen. */
  pageSize?: PageSize
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
  /**
   * Optional clickable URL attached to the field's bounding rect (#87).
   * Either a literal `{ mode: 'static', url }` or a `{ mode: 'dynamic',
   * jsonKey }` resolved from `InputJSON.texts[jsonKey]` at render time.
   * For tables, the link covers the WHOLE table — no per-row variant.
   * Allowed protocols: `https`, `http`, `mailto`, `tel`.
   */
  hyperlink?: Hyperlink
  /**
   * Optional rotation in degrees applied around the field's centre (#172).
   * Positive values rotate clockwise. Unbounded (Fabric `angle` semantics
   * — the sidebar UI normalises display to 0–359 but the schema accepts
   * any number). `undefined`, `null`, and `0` are all rendered as
   * "no rotation" — existing `.tgbl` bundles missing this field continue
   * to load. Applies to every field type (text, image, table).
   */
  rotation?: number | null
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
