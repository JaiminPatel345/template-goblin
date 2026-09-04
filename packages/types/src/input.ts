import type { TableRow } from './template.js'

/** Text input values keyed by field name */
export type TextInputs = Record<string, string>

/** Table input data keyed by table field name */
export type TableInputs = Record<string, TableRow[]>

/**
 * Hyperlink URLs keyed by `field.hyperlink.jsonKey` (#87).
 *
 * Lives in its own top-level bucket so URLs don't get mixed into
 * `texts` — they're a different kind of value (clickable target, not
 * rendered content) and the JSON preview should make that obvious.
 * Allowed protocols at validation time: https, http, mailto, tel.
 */
export type LinkInputs = Record<string, string>

/**
 * One image input slot in `InputJSON.images`.
 *
 * Auto-detected shorthand (recommended for almost all use cases):
 *   - `Buffer` — used directly.
 *   - `string` — resolution order at runtime:
 *       1. `data:` URI → strip prefix, decode base64
 *       2. `http://` / `https://` → fetched via `fetch()`
 *       3. Looks like a filesystem path (`/`, `./`, `../`, `~/`, or
 *          `C:\…` etc.) AND `fs.existsSync()` → `fs.readFile()`
 *       4. Otherwise → bare base64 (catch-all)
 *
 * Explicit object form (escape hatch when auto-detection picks the wrong
 * branch — e.g. base64 that happens to start with `/`):
 *   - `{ type: 'buffer', value: Buffer }`
 *   - `{ type: 'base64', value: string }` — bare base64 OR `data:` URI
 *   - `{ type: 'path', value: string }` — absolute or relative file path
 *   - `{ type: 'url', value: string, headers? }` — HTTP/HTTPS URL with
 *     optional request headers (e.g. an `Authorization` token).
 *
 * All shapes resolve to a `Buffer` in the pre-flight pass before render.
 */
export type ImageInput =
  | Buffer
  | string
  | { type: 'buffer'; value: Buffer }
  | { type: 'base64'; value: string }
  | { type: 'path'; value: string }
  | { type: 'url'; value: string; headers?: Record<string, string> }

/** Image input data keyed by field name. See {@link ImageInput} for shapes. */
export type ImageInputs = Record<string, ImageInput>

/**
 * Complete input JSON passed to `generatePDF()`.
 *
 * Static fields never appear here — their content is baked into the template.
 * Only dynamic fields with a matching `source.jsonKey` are consulted.
 */
export interface InputJSON {
  texts: TextInputs
  images: ImageInputs
  tables: TableInputs
  /**
   * Optional global active condition name (case-sensitive) for condition-based styling.
   * If a field has condition-based styling enabled, matching rules are applied.
   */
  condition?: string
  /**
   * Optional per-field condition names keyed by field ID or jsonKey (case-sensitive).
   * Overrides global `condition` for specific fields.
   */
  conditions?: Record<string, string>
  /**
   * Optional hyperlink URLs, keyed by `field.hyperlink.jsonKey`. Sits
   * alongside `texts` rather than nested inside it so the JSON preview
   * can render URLs as a visually distinct section. Empty / missing
   * entries render the corresponding field with no clickable region —
   * not an error.
   */
  links?: LinkInputs
}

export type { TableRow } from './template.js'
