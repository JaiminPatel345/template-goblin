import type { FieldDefinition, TableRow } from '@template-goblin/types'
import { projectFieldsToJson, collectFields, type BandFieldSets } from './jsonProjection.js'

/**
 * Write-back half of the JSON sync contract (see `jsonProjection.ts`).
 *
 * The JSON panel's structure is always derived from the fields; only
 * VALUES are editable. `diffJsonEdit` compares an edited JSON string
 * against the current projection and returns per-field placeholder
 * patches — the caller applies them through `templateStore.updateField`,
 * the same per-element action the sidebar uses, so canvas, sidebar, and
 * JSON all update from the one store write.
 *
 * Rules:
 *  - Only values that DIFFER from the projection produce patches, so the
 *    self-describing fallbacks (jsonKey, column keys) never get stamped
 *    into placeholders just by round-tripping.
 *  - A key with no matching dynamic field is reported in `unknownKeys`
 *    and ignored — the user must add a field with that jsonKey first.
 *  - Image and link values have no writable placeholder slot here
 *    (images change via the field's upload control; `DynamicHyperlink`
 *    has no placeholder) — edits to them are reported in `readOnlyKeys`.
 *  - Values of the wrong shape (non-string text, non-array table) are
 *    reported in `invalidKeys` and ignored.
 *  - Keys MISSING from the edited JSON are left untouched (deleting a
 *    line is not "clear the placeholder" — it reappears on blur).
 */
export interface JsonEditResult {
  /** False when the text isn't a parseable JSON object. */
  ok: boolean
  /** Parse error message when `ok` is false. */
  error: string | null
  /** Per-field placeholder writes, in field order. */
  patches: PlaceholderPatch[]
  /** Bucket-qualified keys with no matching dynamic field (`texts.foo`). */
  unknownKeys: string[]
  /** Bucket-qualified keys whose values can't be edited from the JSON. */
  readOnlyKeys: string[]
  /** Bucket-qualified keys whose edited value has the wrong shape. */
  invalidKeys: string[]
}

export interface PlaceholderPatch {
  fieldId: string
  placeholder: string | TableRow[] | null
}

/** Fresh result object — arrays must not be shared between calls. */
function emptyResult(ok: boolean, error: string | null): JsonEditResult {
  return { ok, error, patches: [], unknownKeys: [], readOnlyKeys: [], invalidKeys: [] }
}

/**
 * Diff an edited JSON string against the current projection of `fields`
 * and return the per-field placeholder patches plus warnings. Pure — the
 * caller decides how to apply patches and surface warnings.
 */
export function diffJsonEdit(
  text: string,
  fields: FieldDefinition[],
  bandFields: BandFieldSets = {},
  imageDataUrls?: Map<string, string>,
): JsonEditResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (err) {
    return emptyResult(false, err instanceof Error ? err.message : 'Invalid JSON')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyResult(false, 'JSON input must be an object')
  }

  const edited = raw as Record<string, unknown>
  const baseline = projectFieldsToJson(fields, bandFields, imageDataUrls)
  const all = collectFields(fields, bandFields)
  const result = emptyResult(true, null)

  diffTexts(asObject(edited.texts), baseline.texts, all, result)
  diffTables(asObject(edited.tables), baseline.tables, all, result)
  diffImages(asObject(edited.images), baseline.images, all, result)
  diffLinks(asObject(edited.links), baseline.links, all, result)

  for (const key of Object.keys(edited)) {
    if (key !== 'texts' && key !== 'tables' && key !== 'images' && key !== 'links') {
      result.unknownKeys.push(key)
    }
  }

  return result
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

/** All dynamic fields of `type` bound to `jsonKey` — a key can be shared
 *  by several fields; a value edit patches every one of them. */
function targetsOf(
  all: FieldDefinition[],
  type: FieldDefinition['type'],
  jsonKey: string,
): FieldDefinition[] {
  return all.filter(
    (f) => f.type === type && f.source?.mode === 'dynamic' && f.source.jsonKey === jsonKey,
  )
}

function diffTexts(
  edited: Record<string, unknown>,
  baseline: Record<string, string>,
  all: FieldDefinition[],
  result: JsonEditResult,
): void {
  for (const [key, value] of Object.entries(edited)) {
    const targets = targetsOf(all, 'text', key)
    if (targets.length === 0) {
      result.unknownKeys.push(`texts.${key}`)
      continue
    }
    if (typeof value !== 'string') {
      result.invalidKeys.push(`texts.${key}`)
      continue
    }
    if (value === baseline[key]) continue
    // Empty string means "no placeholder" — store null so the projection
    // falls back to the self-describing jsonKey instead of pinning ''.
    const placeholder = value === '' ? null : value
    for (const f of targets) result.patches.push({ fieldId: f.id, placeholder })
  }
}

function diffTables(
  edited: Record<string, unknown>,
  baseline: Record<string, TableRow[]>,
  all: FieldDefinition[],
  result: JsonEditResult,
): void {
  for (const [key, value] of Object.entries(edited)) {
    const targets = targetsOf(all, 'table', key)
    if (targets.length === 0) {
      result.unknownKeys.push(`tables.${key}`)
      continue
    }
    if (!Array.isArray(value)) {
      result.invalidKeys.push(`tables.${key}`)
      continue
    }
    const rows = normalizeRows(value)
    if (JSON.stringify(rows) === JSON.stringify(baseline[key])) continue
    const placeholder = rows.length === 0 ? null : rows
    for (const f of targets) result.patches.push({ fieldId: f.id, placeholder })
  }
}

/** Keep object rows; keep string cells, stringify numbers/booleans, drop
 *  the rest. Mirrors what the renderer accepts for table data. */
function normalizeRows(value: unknown[]): TableRow[] {
  const rows: TableRow[] = []
  for (const r of value) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const row: TableRow = {}
    for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
      if (typeof v === 'string') row[k] = v
      else if (typeof v === 'number' || typeof v === 'boolean') row[k] = String(v)
    }
    rows.push(row)
  }
  return rows
}

function diffImages(
  edited: Record<string, unknown>,
  baseline: Record<string, string | null>,
  all: FieldDefinition[],
  result: JsonEditResult,
): void {
  for (const [key, value] of Object.entries(edited)) {
    if (targetsOf(all, 'image', key).length === 0) {
      result.unknownKeys.push(`images.${key}`)
      continue
    }
    if (value !== baseline[key]) result.readOnlyKeys.push(`images.${key}`)
  }
}

function diffLinks(
  edited: Record<string, unknown>,
  baseline: Record<string, string>,
  all: FieldDefinition[],
  result: JsonEditResult,
): void {
  for (const [key, value] of Object.entries(edited)) {
    const known = all.some((f) => f.hyperlink?.mode === 'dynamic' && f.hyperlink.jsonKey === key)
    if (!known) {
      result.unknownKeys.push(`links.${key}`)
      continue
    }
    if (value !== baseline[key]) result.readOnlyKeys.push(`links.${key}`)
  }
}
