import { validateData } from '../src/validate.js'
import type {
  LoadedTemplate,
  InputJSON,
  TemplateManifest,
  FieldDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  LoopFieldStyle,
} from '@template-goblin/types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Minimal text field style to satisfy the FieldDefinition type. */
const TEXT_STYLE: TextFieldStyle = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontSizeDynamic: false,
  fontSizeMin: 8,
  lineHeight: 1.2,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  align: 'left',
  verticalAlign: 'top',
  maxRows: 1,
  overflowMode: 'truncate',
  snapToGrid: false,
}

/** Minimal image field style. */
const IMAGE_STYLE: ImageFieldStyle = {
  fit: 'cover',
  placeholderFilename: null,
}

/** Minimal loop field style. */
const LOOP_STYLE: LoopFieldStyle = {
  maxRows: 50,
  maxColumns: 5,
  multiPage: false,
  headerStyle: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'bold',
    align: 'left',
    color: '#000000',
    backgroundColor: '#eeeeee',
  },
  rowStyle: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'normal',
    color: '#000000',
    overflowMode: 'truncate',
    fontSizeDynamic: false,
    fontSizeMin: 8,
    lineHeight: 1.2,
  },
  cellStyle: {
    borderWidth: 1,
    borderColor: '#cccccc',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },
  columns: [{ key: 'item', label: 'Item', width: 100, align: 'left' }],
}

/** Build a FieldDefinition helper. */
function makeField(
  overrides: Partial<FieldDefinition> & Pick<FieldDefinition, 'id' | 'type' | 'jsonKey'>,
): FieldDefinition {
  const styleMap: Record<string, TextFieldStyle | ImageFieldStyle | LoopFieldStyle> = {
    text: TEXT_STYLE,
    image: IMAGE_STYLE,
    loop: LOOP_STYLE,
  }

  return {
    groupId: null,
    required: true,
    placeholder: null,
    x: 0,
    y: 0,
    width: 200,
    height: 40,
    zIndex: 0,
    style: styleMap[overrides.type],
    ...overrides,
  }
}

/** Build a minimal LoadedTemplate with the given fields. */
function makeTemplate(fields: FieldDefinition[]): LoadedTemplate {
  const manifest: TemplateManifest = {
    version: '1.0',
    meta: {
      name: 'Test',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    fonts: [],
    groups: [],
    fields,
  }

  return {
    manifest,
    backgroundImage: null,
    fonts: new Map(),
    placeholders: new Map(),
  }
}

/* ------------------------------------------------------------------ */
/*  The template shared by most tests:                                */
/*    - required text field  (texts.name)                             */
/*    - required image field (images.photo)                           */
/*    - required loop field  (loops.items)                            */
/*    - optional text field  (texts.subtitle)                         */
/* ------------------------------------------------------------------ */

const FIELDS: FieldDefinition[] = [
  makeField({ id: 'name', type: 'text', jsonKey: 'texts.name', required: true }),
  makeField({ id: 'photo', type: 'image', jsonKey: 'images.photo', required: true }),
  makeField({ id: 'items', type: 'loop', jsonKey: 'loops.items', required: true }),
  makeField({ id: 'subtitle', type: 'text', jsonKey: 'texts.subtitle', required: false }),
]

const TEMPLATE = makeTemplate(FIELDS)

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('validateData', () => {
  // ---- Complete valid data → valid: true -------------------------

  it('should return valid: true with no errors for complete valid data', () => {
    const data: InputJSON = {
      texts: { name: 'Alice', subtitle: 'Engineer' },
      images: { photo: 'base64encodedstring' },
      loops: { items: [{ item: 'Widget' }] },
    }

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  // ---- Missing required text field ------------------------------

  it('should return MISSING_REQUIRED_FIELD when a required text field is missing', () => {
    const data: InputJSON = {
      texts: {}, // name missing
      images: { photo: 'data' },
      loops: { items: [{ item: 'A' }] },
    }

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_REQUIRED_FIELD',
          field: 'texts.name',
        }),
      ]),
    )
  })

  // ---- Missing required image field -----------------------------

  it('should return MISSING_REQUIRED_FIELD when a required image field is missing', () => {
    const data: InputJSON = {
      texts: { name: 'Alice' },
      images: {}, // photo missing
      loops: { items: [{ item: 'A' }] },
    }

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_REQUIRED_FIELD',
          field: 'images.photo',
        }),
      ]),
    )
  })

  // ---- Optional field missing → still valid ---------------------

  it('should remain valid when an optional field is missing', () => {
    const data: InputJSON = {
      texts: { name: 'Alice' }, // subtitle omitted — it's optional
      images: { photo: 'data' },
      loops: { items: [{ item: 'A' }] },
    }

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  // ---- Text field with number value → INVALID_DATA_TYPE ---------

  it('should return INVALID_DATA_TYPE when a text field receives a number', () => {
    const data = {
      texts: { name: 42 as unknown as string },
      images: { photo: 'data' },
      loops: { items: [{ item: 'A' }] },
    } as unknown as InputJSON

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_DATA_TYPE',
          field: 'texts.name',
        }),
      ]),
    )
  })

  // ---- Loop field with non-array → INVALID_DATA_TYPE ------------

  it('should return INVALID_DATA_TYPE when a loop field receives a non-array value', () => {
    const data = {
      texts: { name: 'Alice' },
      images: { photo: 'data' },
      loops: { items: 'not-an-array' },
    } as unknown as InputJSON

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_DATA_TYPE',
          field: 'loops.items',
        }),
      ]),
    )
  })

  // ---- Image field with number → INVALID_DATA_TYPE --------------

  it('should return INVALID_DATA_TYPE when an image field receives a number', () => {
    const data = {
      texts: { name: 'Alice' },
      images: { photo: 12345 },
      loops: { items: [{ item: 'A' }] },
    } as unknown as InputJSON

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_DATA_TYPE',
          field: 'images.photo',
        }),
      ]),
    )
  })

  // ---- Empty string for required field → MISSING_REQUIRED_FIELD --

  it('should return MISSING_REQUIRED_FIELD when a required field has an empty string', () => {
    const data: InputJSON = {
      texts: { name: '' }, // empty string
      images: { photo: 'data' },
      loops: { items: [{ item: 'A' }] },
    }

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_REQUIRED_FIELD',
          field: 'texts.name',
        }),
      ]),
    )
  })

  // ---- Multiple errors collected at once ------------------------

  it('should collect multiple errors when several fields are invalid', () => {
    const data: InputJSON = {
      texts: {}, // name missing
      images: {}, // photo missing
      loops: { items: [{ item: 'A' }] },
    }

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)

    const codes = result.errors.map((e) => e.code)
    expect(codes).toContain('MISSING_REQUIRED_FIELD')
  })

  // ---- Template with no fields → always valid -------------------

  it('should return valid: true for a template with no fields', () => {
    const emptyTemplate = makeTemplate([])
    const data: InputJSON = { texts: {}, images: {}, loops: {} }

    const result = validateData(emptyTemplate, data)

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  // ---- Image field with valid Buffer → valid --------------------

  it('should accept a Buffer as a valid image field value', () => {
    const data = {
      texts: { name: 'Alice' },
      images: { photo: Buffer.from('png-data') },
      loops: { items: [{ item: 'A' }] },
    } as unknown as InputJSON

    const result = validateData(TEMPLATE, data)

    // The photo field should not produce an INVALID_DATA_TYPE error
    const photoErrors = result.errors.filter((e) => e.field === 'images.photo')
    expect(photoErrors).toEqual([])
  })

  // ---- Loop field with object (not array) → INVALID_DATA_TYPE ---

  it('should return INVALID_DATA_TYPE when a loop field receives a plain object', () => {
    const data = {
      texts: { name: 'Alice' },
      images: { photo: 'data' },
      loops: { items: { item: 'not-array' } },
    } as unknown as InputJSON

    const result = validateData(TEMPLATE, data)

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_DATA_TYPE',
          field: 'loops.items',
        }),
      ]),
    )
  })
})
