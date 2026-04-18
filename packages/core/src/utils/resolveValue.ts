import type {
  FieldDefinition,
  ImageField,
  ImageSourceValue,
  InputJSON,
  TableField,
  TableRow,
  TextField,
} from '@template-goblin/types'

/**
 * Resolve a field's runtime value.
 *
 * For static fields, returns the baked-in `source.value`.
 * For dynamic fields, returns the entry from the matching `InputJSON` bucket
 * (`texts`, `images`, or `tables`) keyed by `source.jsonKey`. Returns
 * `undefined` when the key is absent from the bucket.
 *
 * Never consults `source.placeholder` — placeholders are designer-time canvas
 * preview content and never participate in PDF generation.
 */
export function resolveValue(field: TextField, input: InputJSON): string | undefined
export function resolveValue(
  field: ImageField,
  input: InputJSON,
): ImageSourceValue | Buffer | string | undefined
export function resolveValue(field: TableField, input: InputJSON): TableRow[] | undefined
export function resolveValue(
  field: FieldDefinition,
  input: InputJSON,
): string | ImageSourceValue | Buffer | TableRow[] | undefined
export function resolveValue(field: FieldDefinition, input: InputJSON): unknown {
  if (field.source.mode === 'static') {
    return field.source.value
  }
  const key = field.source.jsonKey
  switch (field.type) {
    case 'text':
      return input.texts?.[key]
    case 'image':
      return input.images?.[key]
    case 'table':
      return input.tables?.[key]
  }
}
