import type { TableRow } from './template.js'

/** Text input values keyed by field name */
export type TextInputs = Record<string, string>

/** Table input data keyed by table field name */
export type TableInputs = Record<string, TableRow[]>

/** Image input data — either a Buffer (Node.js) or base64 string */
export type ImageInputs = Record<string, Buffer | string>

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
}

export type { TableRow } from './template.js'
