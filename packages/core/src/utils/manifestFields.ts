import type { FieldDefinition, TemplateManifest } from '@template-goblin/types'

/**
 * Body + header/footer band fields, flattened.
 *
 * Band fields (#61) render through the same `renderField` and read the
 * same `data.texts` / `data.images` / `data.tables` buckets as body
 * fields — so EVERY pass that walks the manifest's fields (preflight,
 * `validateData`, archive asset loading, font subsetting, referenced-
 * asset collection) must walk all three pools. Walking only
 * `manifest.fields` silently skips band content: required band fields
 * go unvalidated, band image assets never load, band glyphs go
 * unsubsetted.
 */
export function allManifestFields(
  manifest: Pick<TemplateManifest, 'fields' | 'header' | 'footer'>,
): FieldDefinition[] {
  return [
    ...manifest.fields,
    ...(manifest.header?.fields ?? []),
    ...(manifest.footer?.fields ?? []),
  ]
}
