import {
  TemplateGoblinError,
  isValidHyperlinkUrl,
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
  // GH #81 — `{ color: '#hex' }` is a valid `ImageSourceValue` for solid-
  // colour static fields. No image asset; the renderer paints a fill.
  const c = (v as { color?: unknown }).color
  if (typeof c === 'string' && c.length > 0) return true
  const f = (v as { filename?: unknown }).filename
  return typeof f === 'string' && f.length > 0
}

function validateImageField(field: ImageField): void {
  assertSourceMode(field.source, field.id)
  if (field.source.mode === 'static') {
    if (!isImageSourceValue(field.source.value)) {
      fail(
        'INVALID_STATIC_VALUE',
        `Image field ${field.id}: static value must be { filename } or { color }`,
        { fieldId: field.id },
      )
    }
  } else {
    assertDynamicCommon(field.source, field.id)
    const ph = field.source.placeholder
    if (ph !== null && !isImageSourceValue(ph)) {
      fail(
        'INVALID_DYNAMIC_SOURCE',
        `Image field ${field.id}: placeholder must be { filename } / { color } / null`,
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

/**
 * Hyperlink shape check (#87). Static URLs are validated end-to-end here
 * (allowed protocols only). Dynamic links only get their `jsonKey` shape
 * checked at design time — the actual URL string is resolved from input
 * data and validated by `validateData`.
 */
function validateHyperlink(field: FieldDefinition): void {
  const link = field.hyperlink
  if (link === undefined || link === null) return
  if (link.mode === 'static') {
    if (!isValidHyperlinkUrl(link.url)) {
      fail(
        'INVALID_DATA_TYPE',
        `Field ${field.id}: hyperlink.url must be a valid http(s)/mailto/tel URL`,
        { fieldId: field.id, url: link.url },
      )
    }
  } else if (link.mode === 'dynamic') {
    if (typeof link.jsonKey !== 'string' || !isSafeKey(link.jsonKey)) {
      fail(
        'INVALID_DATA_TYPE',
        `Field ${field.id}: hyperlink.jsonKey must match /^[A-Za-z_][A-Za-z0-9_]*$/`,
        { fieldId: field.id, jsonKey: link.jsonKey },
      )
    }
  } else {
    fail('INVALID_DATA_TYPE', `Field ${field.id}: hyperlink.mode must be 'static' or 'dynamic'`, {
      fieldId: field.id,
      mode: (link as { mode?: unknown }).mode,
    })
  }
}

function validateConditionalStyles(field: FieldDefinition): void {
  const condConfig = field.conditionalStyles
  if (!condConfig) return
  if (typeof condConfig.enabled !== 'boolean') {
    fail('INVALID_MANIFEST', `Field ${field.id}: conditionalStyles.enabled must be a boolean`, {
      fieldId: field.id,
    })
  }
  if (!Array.isArray(condConfig.conditions)) {
    fail('INVALID_MANIFEST', `Field ${field.id}: conditionalStyles.conditions must be an array`, {
      fieldId: field.id,
    })
  }
  const seenNames = new Set<string>()
  for (const c of condConfig.conditions) {
    if (typeof c.name !== 'string' || !c.name.trim()) {
      fail(
        'INVALID_MANIFEST',
        `Field ${field.id}: condition rule name must be a non-empty string`,
        {
          fieldId: field.id,
        },
      )
    }
    if (seenNames.has(c.name)) {
      fail('INVALID_MANIFEST', `Field ${field.id}: duplicate condition name '${c.name}'`, {
        fieldId: field.id,
      })
    }
    seenNames.add(c.name)
    if (typeof c.isDefault !== 'boolean') {
      fail('INVALID_MANIFEST', `Field ${field.id}: condition rule isDefault must be a boolean`, {
        fieldId: field.id,
      })
    }
  }
}

function validateField(field: FieldDefinition): void {
  switch (field.type) {
    case 'text':
      validateTextField(field)
      break
    case 'image':
      validateImageField(field)
      break
    case 'table':
      validateTableField(field)
      break
    default: {
      const exhaustive: never = field
      void exhaustive
      fail('INVALID_MANIFEST', `Unknown field type`)
    }
  }
  validateHyperlink(field)
  validateConditionalStyles(field)
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
  validatePageDimensions(manifest)
  for (const field of manifest.fields) {
    validateField(field)
  }
  checkDuplicateJsonKeys(manifest.fields)
  validateBands(manifest)
}

/**
 * Defence-in-depth — reject manifests that carry non-positive / non-finite
 * page dimensions before they ever reach PDFKit. The UI clamps these at
 * input time, but a hand-edited `.tgbl` or a malicious upload could still
 * arrive here with `meta.width = -100` or `pages[0].height = NaN`. PDFKit
 * silently produces a corrupted PDF (or crashes in a worker) on those, so
 * we surface them as a clean validation error.
 */
function validatePageDimensions(manifest: TemplateManifest): void {
  const checkDim = (value: unknown, where: string): void => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
      fail('INVALID_MANIFEST', `${where} must be a finite number ≥ 1 (got ${String(value)})`, {
        where,
        value,
      })
    }
  }
  checkDim(manifest.meta.width, 'meta.width')
  checkDim(manifest.meta.height, 'meta.height')
  // `pages` is optional for legacy single-page templates (see
  // file/read.ts + generate.ts's no-pages branch) — don't crash on it.
  for (const page of manifest.pages ?? []) {
    // Per-page width / height are optional; when present they must be valid.
    if (page.width !== undefined) checkDim(page.width, `pages[${page.id}].width`)
    if (page.height !== undefined) checkDim(page.height, `pages[${page.id}].height`)
  }
}

/**
 * #61 — gated band validation. Only runs when the manifest opts into a
 * header / footer / page-number config so legacy templates (where every
 * field is null on these optional fields) are unaffected.
 */
function validateBands(manifest: TemplateManifest): void {
  if (manifest.header) {
    for (const f of manifest.header.fields) {
      rejectTableInBand(f, 'header')
      validateField(f)
    }
    enforceBodyOutsideBand(manifest, 'header')
  }
  if (manifest.footer) {
    for (const f of manifest.footer.fields) {
      rejectTableInBand(f, 'footer')
      validateField(f)
    }
    enforceBodyOutsideBand(manifest, 'footer')
  }
  validatePageNumberPlacement(manifest)
}

/**
 * Per decision C, bands accept text + image fields only. Tables in a band
 * are spec-out-of-scope (no Phase-1 UI to create one, but a hand-edited
 * manifest could still slip one in). Reject at validation so the renderer
 * never has to defend against it.
 */
function rejectTableInBand(field: FieldDefinition, kind: 'header' | 'footer'): void {
  if (field.type === 'table') {
    fail(
      'INVALID_MANIFEST',
      `${kind} band cannot contain a 'table' field (id: ${field.id}). Only 'text' and 'image' fields are allowed in bands.`,
      { fieldId: field.id, kind, fieldType: field.type },
    )
  }
}

/** Reject body fields whose bounding rect intrudes into the band's Y-band. */
function enforceBodyOutsideBand(manifest: TemplateManifest, kind: 'header' | 'footer'): void {
  const band = kind === 'header' ? manifest.header : manifest.footer
  // A disabled band doesn't paint at PDF time, so body fields inhabiting
  // its former Y-strip are legitimate page content — no overlap to flag.
  // This pairs with the UI's hide-band flow that migrates band fields
  // into body with absolute coords (#61 follow-up).
  if (!band || !band.enabled || band.style.height <= 0) return
  const pageHeight = manifest.meta.height
  const minY = kind === 'header' ? band.style.height : 0
  const maxY = kind === 'header' ? pageHeight : pageHeight - band.style.height
  for (const f of manifest.fields) {
    const top = f.y
    const bottom = f.y + f.height
    if (kind === 'header' && top < minY) {
      fail('FIELD_OVERLAPS_BAND', `Field ${f.id} overlaps header band (y < ${minY})`, {
        fieldId: f.id,
        kind,
        minY,
        actualY: top,
      })
    }
    if (kind === 'footer' && bottom > maxY) {
      fail('FIELD_OVERLAPS_BAND', `Field ${f.id} overlaps footer band (y + height > ${maxY})`, {
        fieldId: f.id,
        kind,
        maxY,
        actualBottom: bottom,
      })
    }
  }
}

/**
 * `pageNumber.enabled && placement === 'header'` requires `header` to be
 * defined (and symmetrically for footer). Without the chosen band, the
 * renderer silently drops the page number — surface the misconfiguration.
 */
function validatePageNumberPlacement(manifest: TemplateManifest): void {
  const cfg = manifest.pageNumber
  if (!cfg?.enabled) return
  if (cfg.placement === 'header' && !manifest.header?.enabled) {
    fail(
      'PAGE_NUMBER_PLACEMENT_INVALID',
      `pageNumber.placement = 'header' but manifest has no enabled header band`,
      { placement: cfg.placement },
    )
  }
  if (cfg.placement === 'footer' && !manifest.footer?.enabled) {
    fail(
      'PAGE_NUMBER_PLACEMENT_INVALID',
      `pageNumber.placement = 'footer' but manifest has no enabled footer band`,
      { placement: cfg.placement },
    )
  }
}
