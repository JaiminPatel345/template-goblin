/**
 * Static content baked into the template. Rendered identically on every
 * generated PDF and never consulted from the `InputJSON` contract.
 */
export interface StaticSource<V> {
  mode: 'static'
  value: V
}

/**
 * Dynamic content filled from `InputJSON` at PDF generation time.
 *
 * - `jsonKey` is the suffix appended to the type-level namespace
 *   (`texts.<jsonKey>`, `images.<jsonKey>`, `tables.<jsonKey>`).
 * - `required` controls whether a missing value is an error at generation
 *   time. Optional fields with no supplied value render nothing.
 * - `placeholder` is designer-time canvas preview content with the same shape
 *   as the eventual runtime value (`string` for text, `{ filename }` for
 *   image, `TableRow[]` for table). It is never used during PDF generation.
 */
export interface DynamicSource<V> {
  mode: 'dynamic'
  jsonKey: string
  required: boolean
  placeholder: V | null
}

/**
 * Discriminated union of static and dynamic field sources.
 *
 * `V` is the runtime value shape for the owning field type:
 * - `string` for text fields
 * - `{ filename: string }` for image fields
 * - `TableRow[]` for table fields
 */
export type FieldSource<V> = StaticSource<V> | DynamicSource<V>

/** Narrow `FieldSource<V>` to `StaticSource<V>`. */
export function isStaticSource<V>(source: FieldSource<V>): source is StaticSource<V> {
  return source.mode === 'static'
}

/** Narrow `FieldSource<V>` to `DynamicSource<V>`. */
export function isDynamicSource<V>(source: FieldSource<V>): source is DynamicSource<V> {
  return source.mode === 'dynamic'
}
