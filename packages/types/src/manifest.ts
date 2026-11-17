import type {
  FieldDefinition,
  FontDefinition,
  GroupDefinition,
  PageDefinition,
  TemplateMeta,
} from './template.js'

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
 */
export interface PageBand {
  /** When false, the band is hidden but its config is preserved. */
  enabled: boolean
  style: PageBandStyle
  /** Fields rendered inside the band; x/y are band-local. Text + image only. */
  fields: FieldDefinition[]
  /** When false, the band is omitted from page index 0. Default true. */
  applyToFirstPage: boolean
}

/** Numeral system used to format the page-number value at render time. */
export type PageNumberNumeralStyle = 'arabic' | 'roman'
/** Which band the page number is stamped into. */
export type PageNumberPlacement = 'header' | 'footer'
/** Horizontal alignment of the page number within its band. */
export type PageNumberAlign = 'left' | 'center' | 'right'

/**
 * Page-number configuration (#61).
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
