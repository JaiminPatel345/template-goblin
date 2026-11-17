import type {
  FontStyle,
  FontWeight,
  OverflowMode,
  TextAlign,
  TextDecoration,
  VerticalAlign,
} from './template.js'
import type { TableHeightMode } from './tableHeight.js'

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
  /**
   * Height and pagination mode for the table.
   * - `'fixed'`: table content is bounded by `field.height`; extra rows are clipped.
   * - `'single_page_dynamic'`: single page dynamically grows in height to fit all rows,
   *   pushing content below down.
   * - `'multipage'`: table splits into continuation pages when rows overflow.
   */
  heightMode?: TableHeightMode
  /** When false, the header row is skipped entirely at render time. */
  showHeader: boolean
  /**
   * Optional explicit height in points for the table header row.
   * When omitted or null, calculated automatically from headerStyle (fontSize + vertical padding).
   */
  headerHeight?: number | null
  /**
   * When true (default), the table's outer perimeter is drawn down to the
   * last rendered row's bottom edge instead of the field rect's full
   * height.
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
   * Optional table-level outer perimeter style.
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
