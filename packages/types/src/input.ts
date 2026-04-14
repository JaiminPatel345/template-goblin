/** Text input values keyed by field name */
export type TextInputs = Record<string, string>

/** A single row in a loop/table — column key → cell value */
export type LoopRow = Record<string, string>

/** Loop input data keyed by loop name */
export type LoopInputs = Record<string, LoopRow[]>

/** Image input data — either a Buffer (Node.js) or base64 string */
export type ImageInputs = Record<string, Buffer | string>

/** The complete input JSON passed to generatePDF() */
export interface InputJSON {
  texts: TextInputs
  loops: LoopInputs
  images: ImageInputs
}
