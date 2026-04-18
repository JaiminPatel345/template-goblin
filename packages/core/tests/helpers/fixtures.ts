/**
 * Shared test fixtures for the Phase-1 source schema.
 *
 * All test files should import the helpers and constants here so that the
 * schema shape lives in exactly one place.
 */
import type {
  CellStyle,
  FieldDefinition,
  ImageField,
  ImageFieldStyle,
  PageDefinition,
  TableField,
  TableFieldStyle,
  TemplateManifest,
  TextField,
  TextFieldStyle,
} from '@template-goblin/types'

/* ------------------------------------------------------------------ */
/*  Style constants                                                   */
/* ------------------------------------------------------------------ */

export const TEXT_STYLE: TextFieldStyle = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontSizeDynamic: false,
  fontSizeMin: 6,
  lineHeight: 1.2,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  align: 'left',
  verticalAlign: 'top',
  maxRows: 1,
  overflowMode: 'truncate',
  snapToGrid: true,
}

export const IMAGE_STYLE: ImageFieldStyle = { fit: 'contain' }

export const BASE_CELL: CellStyle = {
  fontFamily: 'Helvetica',
  fontSize: 10,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#cccccc',
  paddingTop: 2,
  paddingBottom: 2,
  paddingLeft: 4,
  paddingRight: 4,
  align: 'left',
  verticalAlign: 'top',
}

/**
 * Build a TableFieldStyle with the supplied column keys. Each column gets a
 * label equal to its key, a default 100pt width, and no per-column overrides.
 */
export function tableStyle(columnKeys: string[] = ['col']): TableFieldStyle {
  return {
    maxRows: 100,
    maxColumns: 10,
    multiPage: false,
    showHeader: true,
    headerStyle: { ...BASE_CELL, fontWeight: 'bold', backgroundColor: '#eeeeee' },
    rowStyle: BASE_CELL,
    oddRowStyle: null,
    evenRowStyle: null,
    cellStyle: { overflowMode: 'truncate' },
    columns: columnKeys.map((key) => ({
      key,
      label: key,
      width: 100,
      style: null,
      headerStyle: null,
    })),
  }
}

/* ------------------------------------------------------------------ */
/*  Field builders                                                    */
/* ------------------------------------------------------------------ */

export interface FieldGeometry {
  x?: number
  y?: number
  width?: number
  height?: number
  zIndex?: number
  pageId?: string | null
  groupId?: string | null
  label?: string
}

const DEFAULT_GEOM = { x: 0, y: 0, width: 200, height: 30, zIndex: 0 } as const

/** Build a dynamic text field. */
export function dynText(
  id: string,
  jsonKey: string,
  required: boolean,
  geom: FieldGeometry = {},
  style: TextFieldStyle = TEXT_STYLE,
  placeholder: string | null = null,
): TextField {
  return {
    id,
    type: 'text',
    label: geom.label ?? id,
    groupId: geom.groupId ?? null,
    pageId: geom.pageId ?? null,
    x: geom.x ?? DEFAULT_GEOM.x,
    y: geom.y ?? DEFAULT_GEOM.y,
    width: geom.width ?? DEFAULT_GEOM.width,
    height: geom.height ?? DEFAULT_GEOM.height,
    zIndex: geom.zIndex ?? DEFAULT_GEOM.zIndex,
    style,
    source: { mode: 'dynamic', jsonKey, required, placeholder },
  }
}

/** Build a static text field. */
export function staticText(
  id: string,
  value: string,
  geom: FieldGeometry = {},
  style: TextFieldStyle = TEXT_STYLE,
): TextField {
  return {
    id,
    type: 'text',
    label: geom.label ?? id,
    groupId: geom.groupId ?? null,
    pageId: geom.pageId ?? null,
    x: geom.x ?? DEFAULT_GEOM.x,
    y: geom.y ?? DEFAULT_GEOM.y,
    width: geom.width ?? DEFAULT_GEOM.width,
    height: geom.height ?? DEFAULT_GEOM.height,
    zIndex: geom.zIndex ?? DEFAULT_GEOM.zIndex,
    style,
    source: { mode: 'static', value },
  }
}

/** Build a dynamic image field. */
export function dynImage(
  id: string,
  jsonKey: string,
  required: boolean,
  geom: FieldGeometry = {},
  style: ImageFieldStyle = IMAGE_STYLE,
  placeholder: { filename: string } | null = null,
): ImageField {
  return {
    id,
    type: 'image',
    label: geom.label ?? id,
    groupId: geom.groupId ?? null,
    pageId: geom.pageId ?? null,
    x: geom.x ?? 0,
    y: geom.y ?? 0,
    width: geom.width ?? 150,
    height: geom.height ?? 150,
    zIndex: geom.zIndex ?? 0,
    style,
    source: { mode: 'dynamic', jsonKey, required, placeholder },
  }
}

/** Build a dynamic table field. */
export function dynTable(
  id: string,
  jsonKey: string,
  required: boolean,
  columnKeys: string[] = ['col'],
  geom: FieldGeometry = {},
): TableField {
  return {
    id,
    type: 'table',
    label: geom.label ?? id,
    groupId: geom.groupId ?? null,
    pageId: geom.pageId ?? null,
    x: geom.x ?? 0,
    y: geom.y ?? 0,
    width: geom.width ?? 400,
    height: geom.height ?? 200,
    zIndex: geom.zIndex ?? 0,
    style: tableStyle(columnKeys),
    source: { mode: 'dynamic', jsonKey, required, placeholder: null },
  }
}

/* ------------------------------------------------------------------ */
/*  Manifest factory                                                  */
/* ------------------------------------------------------------------ */

/** Build a minimal valid TemplateManifest with the given fields. */
export function makeManifest(overrides: Partial<TemplateManifest> = {}): TemplateManifest {
  return {
    version: '1.0',
    meta: {
      name: 'Test',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    fonts: [],
    groups: [],
    pages: [],
    fields: [],
    ...overrides,
  }
}

/** Convenience type for building tests that need a list of fields. */
export type AnyField = FieldDefinition

export type { PageDefinition }
