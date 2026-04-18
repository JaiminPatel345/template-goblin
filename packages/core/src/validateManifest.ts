import {
  TemplateGoblinError,
  type ErrorCode,
  type FieldDefinition,
  type ImageField,
  type ImageSourceValue,
  type TableField,
  type TableRow,
  type TemplateManifest,
  type TextField,
} from '@template-goblin/types'
import { isSafeKey } from './utils/safeKey.js'

function fail(code: ErrorCode, message: string, details?: Record<string, unknown>): never {
  throw new TemplateGoblinError(code, message, details)
}

function assertSourceMode(source: unknown, fieldId: string): void {
  if (source === null || typeof source !== 'object') {
    fail('INVALID_SOURCE_MODE', `Field ${fieldId}: source is missing or not an object`, { fieldId })
  }
  const mode = (source as { mode?: unknown }).mode
  if (mode !== 'static' && mode !== 'dynamic') {
    fail('INVALID_SOURCE_MODE', `Field ${fieldId}: source.mode must be 'static' or 'dynamic'`, {
      fieldId,
      actual: mode,
    })
  }
}

function assertDynamicCommon(
  source: { jsonKey: unknown; required: unknown },
  fieldId: string,
): void {
  if (typeof source.jsonKey !== 'string' || !isSafeKey(source.jsonKey)) {
    fail(
      'INVALID_DYNAMIC_SOURCE',
      `Field ${fieldId}: jsonKey must match /^[A-Za-z_][A-Za-z0-9_]*$/`,
      { fieldId, actual: source.jsonKey },
    )
  }
  if (typeof source.required !== 'boolean') {
    fail('INVALID_DYNAMIC_SOURCE', `Field ${fieldId}: required must be a boolean`, { fieldId })
  }
}

function validateTextField(field: TextField): void {
  assertSourceMode(field.source, field.id)
  if (field.source.mode === 'static') {
    if (typeof field.source.value !== 'string') {
      fail('INVALID_STATIC_VALUE', `Text field ${field.id}: static value must be a string`, {
        fieldId: field.id,
      })
    }
  } else {
    assertDynamicCommon(field.source, field.id)
    const ph = field.source.placeholder
    if (ph !== null && typeof ph !== 'string') {
      fail(
        'INVALID_DYNAMIC_SOURCE',
        `Text field ${field.id}: placeholder must be a string or null`,
        { fieldId: field.id },
      )
    }
  }
}

function isImageSourceValue(v: unknown): v is ImageSourceValue {
  if (v === null || typeof v !== 'object') return false
  const f = (v as { filename?: unknown }).filename
  return typeof f === 'string' && f.length > 0
}

function validateImageField(field: ImageField): void {
  assertSourceMode(field.source, field.id)
  if (field.source.mode === 'static') {
    if (!isImageSourceValue(field.source.value)) {
      fail(
        'INVALID_STATIC_VALUE',
        `Image field ${field.id}: static value must be { filename: non-empty string }`,
        { fieldId: field.id },
      )
    }
  } else {
    assertDynamicCommon(field.source, field.id)
    const ph = field.source.placeholder
    if (ph !== null && !isImageSourceValue(ph)) {
      fail(
        'INVALID_DYNAMIC_SOURCE',
        `Image field ${field.id}: placeholder must be { filename: string } or null`,
        { fieldId: field.id },
      )
    }
  }
}

function validateTableRows(rows: TableRow[], columnKeys: Set<string>, fieldId: string): void {
  rows.forEach((row, i) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      fail('INVALID_TABLE_ROW', `Table field ${fieldId}: row ${i} must be an object`, {
        fieldId,
        rowIndex: i,
      })
    }
    for (const key of Object.keys(row)) {
      if (!columnKeys.has(key)) {
        fail(
          'INVALID_TABLE_ROW',
          `Table field ${fieldId}: row ${i} has unknown column key '${key}'`,
          { fieldId, rowIndex: i, key },
        )
      }
      if (typeof (row as Record<string, unknown>)[key] !== 'string') {
        fail(
          'INVALID_TABLE_ROW',
          `Table field ${fieldId}: row ${i} key '${key}' must be a string`,
          { fieldId, rowIndex: i, key },
        )
      }
    }
  })
}

function validateTableField(field: TableField): void {
  assertSourceMode(field.source, field.id)
  const columnKeys = new Set(field.style.columns.map((c) => c.key))
  if (field.source.mode === 'static') {
    const rows = field.source.value
    if (!Array.isArray(rows)) {
      fail(
        'INVALID_STATIC_VALUE',
        `Table field ${field.id}: static value must be an array of row objects`,
        { fieldId: field.id },
      )
    }
    validateTableRows(rows, columnKeys, field.id)
  } else {
    assertDynamicCommon(field.source, field.id)
    const ph = field.source.placeholder
    if (ph !== null) {
      if (!Array.isArray(ph)) {
        fail(
          'INVALID_DYNAMIC_SOURCE',
          `Table field ${field.id}: placeholder must be TableRow[] or null`,
          { fieldId: field.id },
        )
      }
      validateTableRows(ph, columnKeys, field.id)
    }
  }
}

function validateField(field: FieldDefinition): void {
  switch (field.type) {
    case 'text':
      validateTextField(field)
      return
    case 'image':
      validateImageField(field)
      return
    case 'table':
      validateTableField(field)
      return
    default: {
      const exhaustive: never = field
      void exhaustive
      fail('INVALID_MANIFEST', `Unknown field type`)
    }
  }
}

function checkDuplicateJsonKeys(fields: FieldDefinition[]): void {
  const seen: Record<FieldDefinition['type'], Set<string>> = {
    text: new Set(),
    image: new Set(),
    table: new Set(),
  }
  for (const f of fields) {
    if (f.source.mode !== 'dynamic') continue
    const bucket = seen[f.type]
    if (bucket.has(f.source.jsonKey)) {
      fail(
        'DUPLICATE_JSON_KEY',
        `Duplicate dynamic jsonKey '${f.source.jsonKey}' among ${f.type} fields`,
        { type: f.type, jsonKey: f.source.jsonKey },
      )
    }
    bucket.add(f.source.jsonKey)
  }
}

/**
 * Validate a parsed TemplateManifest against the v2.0 schema rules covering
 * the `source` discriminator, static value shapes, dynamic jsonKey format,
 * placeholder shape per field type, table row/column consistency, and
 * per-type jsonKey uniqueness.
 *
 * Archive-existence checks (static image files in `images/`, placeholder image
 * files in `placeholders/`) are performed separately during `loadTemplate`
 * once the archive contents are known.
 *
 * @throws {TemplateGoblinError} on the first violation encountered.
 */
export function validateManifest(manifest: TemplateManifest): void {
  for (const field of manifest.fields) {
    validateField(field)
  }
  checkDuplicateJsonKeys(manifest.fields)
}
