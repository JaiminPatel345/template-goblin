import type { FieldDefinition, TableField, TableRow, ConditionInput } from '@template-goblin/types'

/**
 * JSON projection — the single derived view of the template's dynamic
 * fields that the JSON panel, the canvas live preview, and the Preview
 * dialog all read.
 *
 * There is exactly ONE state: the fields themselves (templateStore body +
 * band pools). This module projects that state into the `InputJSON`-shaped
 * object (key = `source.jsonKey`, value = `source.placeholder` or a
 * self-describing fallback) and never stores anything. Editing a value in
 * the JSON panel writes back into the owning field's placeholder via
 * `diffJsonEdit` (see `jsonApply.ts`) — so the projection can never drift
 * from the canvas or the sidebar.
 */
export interface ProjectedJson {
  texts: Record<string, string>
  tables: Record<string, TableRow[]>
  images: Record<string, string | null>
  /**
   * Dynamic hyperlink URLs, keyed by `field.hyperlink.jsonKey` (#87).
   * Lives in its own bucket alongside `texts` so URLs are visually
   * distinct from rendered text content in the JSON preview.
   */
  links: Record<string, string>
  /**
   * Optional active/default condition array for condition-based styling (#43).
   * Format: `[{ [keyName]: conditionName }, ...]`
   */
  condition?: ConditionInput
  /**
   * Optional per-field condition mapping (#43).
   */
  conditions?: Record<string, string>
}

/** Header / footer band field pools (#61) — band fields share the
 *  renderer's flat data buckets with body fields, so their dynamic
 *  jsonKeys project into the same `texts`/`images`/`tables` objects. */
export interface BandFieldSets {
  header?: FieldDefinition[]
  footer?: FieldDefinition[]
}

/**
 * Sentinel suffix appended to placeholder image data URLs so the
 * Preview-dialog merge code can detect 'this came from the auto-
 * generated example, don't overlay it onto the real buffer'. See
 * `PreviewDialog.handleRender` (#165).
 */
export const IMAGE_PLACEHOLDER_SENTINEL = '...<placeholder>'

/** Max length of the visible base64 head before the sentinel suffix. */
const IMAGE_PLACEHOLDER_HEAD = 80

/** Sample value projected for a dynamic hyperlink jsonKey — recognisable
 *  and replaceable; there is no placeholder slot on `DynamicHyperlink`,
 *  so this value is read-only in the JSON panel. */
export const LINK_SAMPLE_URL = 'https://example.com'

/**
 * Literal marker projected for a REQUIRED dynamic image that has no
 * placeholder bitmap. Unlike the sentinel above it maps to no real bytes
 * anywhere — consumers (PreviewDialog) must treat it as "not supplied",
 * never feed it to the renderer as base64.
 */
export const IMAGE_REQUIRED_MARKER = '<base64-image-data>'

/** Flatten body + band fields in projection order (body, header, footer). */
export function collectFields(
  fields: FieldDefinition[],
  bandFields: BandFieldSets = {},
): FieldDefinition[] {
  return [...fields, ...(bandFields.header ?? []), ...(bandFields.footer ?? [])]
}

/**
 * Project the template's dynamic fields into the JSON the panel shows and
 * the canvas renders against. Pure — same fields in, same object out.
 *
 * @param fields - Body field definitions
 * @param bandFields - Header / footer band field pools (#61)
 * @param imageDataUrls - Optional filename → data URL map for resolved
 *   placeholder bitmaps. When a dynamic image field's placeholder is in
 *   the map, the emitted value is the data URL's first 80 chars +
 *   IMAGE_PLACEHOLDER_SENTINEL so the panel reads as real data without
 *   flooding the editor with multi-KB base64 blobs (#165).
 */
export function projectFieldsToJson(
  fields: FieldDefinition[],
  bandFields: BandFieldSets = {},
  imageDataUrls?: Map<string, string>,
): ProjectedJson {
  const result: ProjectedJson = { texts: {}, tables: {}, images: {}, links: {} }

  for (const field of collectFields(fields, bandFields)) {
    // Defence in depth: skip fields missing `source` (corrupt rehydrated state).
    if (!field.source) continue
    if (field.source.mode === 'dynamic') {
      const { jsonKey, required, placeholder } = field.source
      if (jsonKey) {
        switch (field.type) {
          case 'text':
            result.texts[jsonKey] = projectTextValue(placeholder, required, jsonKey)
            break
          case 'image':
            result.images[jsonKey] = projectImageValue(placeholder, required, imageDataUrls)
            break
          case 'table':
            result.tables[jsonKey] = projectTableRows(field, placeholder, required)
            break
        }
      }
    }
    // GH #87 — dynamic hyperlinks contribute their own jsonKey to the
    // dedicated `links` bucket. Multiple fields with the same hyperlink
    // key collapse to one entry.
    if (
      field.hyperlink &&
      field.hyperlink.mode === 'dynamic' &&
      field.hyperlink.jsonKey &&
      result.links[field.hyperlink.jsonKey] === undefined
    ) {
      result.links[field.hyperlink.jsonKey] = LINK_SAMPLE_URL
    }
  }

  // Condition-based styling (#43): project active/default conditions as [{ [keyName]: conditionName }]
  const conditionList: Record<string, string>[] = []
  for (const field of collectFields(fields, bandFields)) {
    if (field.conditionalStyles?.enabled && field.conditionalStyles.conditions.length > 0) {
      const keyName =
        field.source?.mode === 'dynamic' && 'jsonKey' in field.source && field.source.jsonKey
          ? field.source.jsonKey
          : field.id
      const activeRule =
        field.conditionalStyles.conditions.find(
          (c) => c.id === field.conditionalStyles?.activeConditionId,
        ) ??
        field.conditionalStyles.conditions.find((c) => c.isDefault) ??
        field.conditionalStyles.conditions[0]
      if (activeRule?.name) {
        conditionList.push({ [keyName]: activeRule.name })
      }
    }
  }
  if (conditionList.length > 0) {
    result.condition = conditionList
  }

  return result
}

/** The canonical text shown in the JSON panel — always 2-space formatted. */
export function projectionToText(projection: ProjectedJson): string {
  return JSON.stringify(projection, null, 2)
}

function projectTextValue(placeholder: unknown, required: boolean, jsonKey: string): string {
  // GH #25 / #90: when the user typed a placeholder for the dynamic field,
  // surface it as the JSON value so panel, canvas, and preview all match.
  if (typeof placeholder === 'string' && placeholder.length > 0) return placeholder
  // #174: with no placeholder, a required field previews as its own jsonKey
  // (not a generic 'A') so the canvas is self-describing. Optional fields
  // stay '' in the JSON; the canvas falls back to the jsonKey via
  // `fieldCanvasLabel` anyway.
  return required ? jsonKey : ''
}

function projectImageValue(
  placeholder: unknown,
  required: boolean,
  imageDataUrls?: Map<string, string>,
): string | null {
  // #165: when the field's placeholder bitmap resolves to a stored
  // data URL, emit the first chunk + a sentinel suffix so the JSON
  // panel reads as 'real' data without printing the full base64.
  if (placeholder && typeof placeholder === 'object' && 'filename' in placeholder) {
    const filename = (placeholder as { filename: unknown }).filename
    if (typeof filename === 'string' && filename.length > 0) {
      const dataUrl = imageDataUrls?.get(filename)
      if (dataUrl) {
        return dataUrl.slice(0, IMAGE_PLACEHOLDER_HEAD) + IMAGE_PLACEHOLDER_SENTINEL
      }
      // No bitmap in the map — fall back to the bare filename (pre-#165 behaviour).
      return filename
    }
  }
  return required ? IMAGE_REQUIRED_MARKER : null
}

/**
 * Project a table's FULL placeholder row array (not just row 1) so the
 * JSON ⇄ placeholder round-trip is lossless. Cells that aren't strings
 * fall back to the column key — the same self-describing convention #174
 * established for texts. A required table with no placeholder projects
 * one self-describing row; an optional one projects `[]`.
 */
function projectTableRows(field: TableField, placeholder: unknown, required: boolean): TableRow[] {
  const columns = field.style.columns || []

  if (Array.isArray(placeholder) && placeholder.length > 0) {
    return placeholder
      .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
      .map((sample) => {
        const row: TableRow = {}
        for (const col of columns) {
          const value = sample[col.key]
          row[col.key] = typeof value === 'string' ? value : col.key
        }
        return row
      })
  }

  if (!required) return []
  const row: TableRow = {}
  for (const col of columns) row[col.key] = col.key
  return [row]
}

/**
 * Detect a JSON-preview image value that came from
 * `IMAGE_PLACEHOLDER_SENTINEL` — used by `PreviewDialog.handleRender`
 * to skip overlaying the truncated string onto the placeholder
 * buffer when the user clicks Render without editing the JSON.
 */
export function isPlaceholderImageSentinel(value: unknown): boolean {
  return typeof value === 'string' && value.endsWith(IMAGE_PLACEHOLDER_SENTINEL)
}
