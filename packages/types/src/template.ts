import type { FieldSource } from './source.js'
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
  /** Hex fill colour, or `null` for a transparent (no-fill) cell background. */
  backgroundColor: string | null
  borderWidth: number
  /** Hex stroke colour, or `null` for a transparent (no-stroke) cell border. */
  borderColor: string | null
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
  align: TextAlign
  verticalAlign: VerticalAlign
}

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
  /**
   * When true (default), the table's outer perimeter is drawn down to the
   * last rendered row's bottom edge instead of the field rect's full
   * height. Eliminates the empty whitespace + dangling border that legacy
   * `field.height`-based perimeter drawing left when row data was shorter
   * than the rect (#76 follow-up). The field's geometry rect is unchanged;
   * only the painted perimeter collapses. Multi-page chunks still draw a
   * full-height perimeter on every page except the last.
   *
   * Optional for backward compatibility with templates saved before this
   * field existed; the renderer treats `undefined` as `true`.
   */
  fitToContent?: boolean
  headerStyle: CellStyle
  rowStyle: CellStyle
  /** Applied to rows with odd 0-indexed position (rows 1, 3, 5...). */
  oddRowStyle: Partial<CellStyle> | null
  /** Applied to rows with even 0-indexed position (rows 0, 2, 4...). */
  evenRowStyle: Partial<CellStyle> | null
  cellStyle: TableCellRuntimeStyle
  columns: TableColumn[]
  /**
   * Optional table-level outer perimeter style (#76 follow-up).
   *
   * When present, the renderer paints the table's outer border using
   * `tableBorder.color` / `tableBorder.width` instead of falling back to
   * `rowStyle.borderColor` / `borderWidth`. Cell-level strokes are still
   * drawn from `CellStyle` for users who want internal grid lines.
   *
   * Optional for backward compatibility with templates saved before this
   * field existed; the renderer falls back to `rowStyle` when absent.
   */
  tableBorder?: TableBorderStyle
}

/** Outer-perimeter style for a table — independent of per-cell borders. */
export interface TableBorderStyle {
  /** Hex stroke colour, or `null` for no perimeter. */
  color: string | null
  /** Stroke width in points. `0` also suppresses the perimeter. */
  width: number
}

/** A single row in a table — column key -> cell string value. */
export type TableRow = Record<string, string>

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

// ─── Page Bands (#61: header / footer) ──────────────────────────────────────

/** Optional divider line drawn at the band's body-facing edge. */
export interface PageBandDivider {
  /** Hex stroke colour; null disables the divider without removing the object. */
  color: string | null
  /** Stroke width in points. */
  width: number
  /** Gap (pt) between the divider and the body content area. */
  gap: number
}

/** Visual style applied to a page band (header or footer). */
export interface PageBandStyle {
  /** Band height in points. The band reserves this much Y-space at the top
   *  (header) or bottom (footer) of every page. */
  height: number
  /** Optional solid background colour for the band; null = transparent. */
  backgroundColor: string | null
  /** Optional auto-rendered divider at the band's body-facing edge. */
  divider: PageBandDivider | null
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
}

/**
 * A page-wide header or footer region. Rendered identically on every page
 * (single source of truth — never duplicated per page). Fields inside a
 * band carry x/y in BAND-LOCAL coordinates (origin = band's top-left), not
 * page coordinates.
 *
 * `enabled` flips visibility without losing the band's style — toggling
 * "Hide header" in the editor must remember height / padding / divider /
 * applyToFirstPage so re-showing the band restores exactly the same look.
 * Band fields are migrated to the body field array on hide and stay there
 * (they don't pop back into the band on re-show); see the store's
 * `setHeaderEnabled` / `setFooterEnabled` mutations.
 */
export interface PageBand {
  /** When false, the band is hidden but its config is preserved. */
  enabled: boolean
  style: PageBandStyle
  /** Fields rendered inside the band; x/y are band-local. Text + image only. */
  fields: FieldDefinition[]
  /** When false, the band is omitted from page index 0 (Word-style "different
   *  first page"). Default true. */
  applyToFirstPage: boolean
}

/** Numeral system used to format the page-number value at render time. */
export type PageNumberNumeralStyle = 'arabic' | 'roman'
/** Which band the page number is stamped into. */
export type PageNumberPlacement = 'header' | 'footer'
/** Horizontal alignment of the page number within its band. */
export type PageNumberAlign = 'left' | 'center' | 'right'

/**
 * Page-number configuration (#61). When `enabled`, the renderer stamps the
 * formatted page number into the chosen band on every page (subject to
 * `showOnFirstPage`). Implemented as configuration rather than a placeable
 * field — single-source-of-truth and zero extra schema for the common case.
 */
export interface PageNumberConfig {
  enabled: boolean
  placement: PageNumberPlacement
  align: PageNumberAlign
  /** Hex colour. */
  color: string
  numeralStyle: PageNumberNumeralStyle
  fontFamily: string
  fontSize: number
  /** When false, the number is omitted from page index 0. Default false. */
  showOnFirstPage: boolean
}

/** The complete template manifest stored as manifest.json inside .tgbl */
export interface TemplateManifest {
  version: string
  meta: TemplateMeta
  fonts: FontDefinition[]
  groups: GroupDefinition[]
  /** Pages in the template (at least one). */
  pages: PageDefinition[]
  fields: FieldDefinition[]
  /** Optional page-wide header (#61). Rendered on every page; opt-in. */
  header?: PageBand
  /** Optional page-wide footer (#61). Rendered on every page; opt-in. */
  footer?: PageBand
  /** Optional page-number stamp (#61). Rendered into header or footer. */
  pageNumber?: PageNumberConfig
}
