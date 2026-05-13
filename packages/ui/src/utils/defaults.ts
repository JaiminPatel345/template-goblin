import type {
  CellStyle,
  FieldDefinition,
  FieldType,
  ImageField,
  TableField,
  TextField,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
} from '@template-goblin/types'

/**
 * Default `CellStyle` used when constructing a new table field's header/row
 * style, or when UI code needs a complete style to seed a newly-added column.
 *
 * `CellStyle` has 15 required properties — factoring this out keeps new-field
 * constructors from duplicating the full literal.
 */
export function defaultCellStyle(overrides: Partial<CellStyle> = {}): CellStyle {
  return {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#cccccc',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    // GH #39: new fields default to centred horizontally + vertically.
    // Most templates centre title-style content; left+top forced users to
    // change two settings on every new field.
    align: 'center',
    verticalAlign: 'middle',
    ...overrides,
  }
}

/**
 * Default `TextFieldStyle` for a freshly created text field.
 */
export function defaultTextStyle(): TextFieldStyle {
  return {
    fontId: null,
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontSizeMin: 11,
    lineHeight: 1.2,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    // GH #39: new text fields default to centred horizontally + vertically.
    align: 'center',
    verticalAlign: 'middle',
    maxRows: 3,
    // GH #91: 'truncate' is the friendlier default — content stays at the
    // user's authored fontSize until it truly doesn't fit, then we cut the
    // tail. Designers who want the renderer to shrink instead can switch
    // the dropdown to 'Dynamic Font'.
    overflowMode: 'truncate',
    snapToGrid: true,
  }
}

/**
 * Default `ImageFieldStyle` for a freshly created image field.
 */
export function defaultImageStyle(): ImageFieldStyle {
  return { fit: 'contain' }
}

/**
 * Default `TableFieldStyle` for a freshly created table field.
 */
export function defaultTableStyle(): TableFieldStyle {
  return {
    maxRows: 20,
    maxColumns: 5,
    multiPage: false,
    showHeader: true,
    // #76 follow-up: collapse the painted perimeter to the last rendered
    // row by default so short tables don't trail an empty bordered box.
    fitToContent: true,
    // #76 follow-up (option b): new tables ship with an outer perimeter
    // only; per-cell strokes are off by default so the table reads as a
    // single bordered grid rather than a busy mesh of individual cells.
    // Users can opt into grid lines via the Cell Border Width control.
    tableBorder: { color: '#000000', width: 1 },
    headerStyle: defaultCellStyle({
      fontWeight: 'bold',
      backgroundColor: '#f0f0f0',
      borderWidth: 0,
    }),
    rowStyle: defaultCellStyle({ backgroundColor: '#ffffff', borderWidth: 0 }),
    oddRowStyle: null,
    evenRowStyle: null,
    cellStyle: { overflowMode: 'dynamic_font' },
    columns: [],
  }
}

/**
 * Construct a new `FieldDefinition` in dynamic-source mode with UI defaults.
 *
 * Phase 1 UI does not yet support static fields or the creation-popup —
 * every newly drawn field is created as dynamic with empty `jsonKey` and
 * `required: true`. Static-mode UI wiring lands in Phase 4.
 */
export function createDefaultField(
  type: FieldType,
  geometry: {
    id: string
    groupId?: string | null
    pageId: string | null
    x: number
    y: number
    width: number
    height: number
    zIndex: number
  },
): FieldDefinition {
  const base = {
    id: geometry.id,
    groupId: geometry.groupId ?? null,
    pageId: geometry.pageId,
    label: '',
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    zIndex: geometry.zIndex,
  }

  if (type === 'text') {
    const field: TextField = {
      ...base,
      type: 'text',
      style: defaultTextStyle(),
      source: { mode: 'dynamic', jsonKey: '', required: true, placeholder: null },
    }
    return field
  }

  if (type === 'image') {
    const field: ImageField = {
      ...base,
      type: 'image',
      style: defaultImageStyle(),
      source: { mode: 'dynamic', jsonKey: '', required: true, placeholder: null },
    }
    return field
  }

  const field: TableField = {
    ...base,
    type: 'table',
    style: defaultTableStyle(),
    source: { mode: 'dynamic', jsonKey: '', required: true, placeholder: null },
  }
  return field
}
