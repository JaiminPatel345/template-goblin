/**
 * Solid-colour image marker (#81).
 *
 * Designers can supply a "solid colour" image by passing the literal string
 * `<STATICIMAGE_COLOR_#rgb>` or `<STATICIMAGE_COLOR_#rrggbb>` in the
 * `images.<key>` slot of `InputJSON`. The renderer paints the field's
 * rectangle in that colour instead of decoding any bytes — there is no
 * image asset, just a fill.
 *
 * Same idea is exposed in the manifest via `ImageSourceValue = { color }`
 * for static fields; this module only handles the dynamic-input string
 * form. Case-sensitive prefix per the user's spec.
 */

const MARKER_RE = /^<STATICIMAGE_COLOR_(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))>$/

/**
 * Return the embedded hex colour if `value` is a solid-colour marker
 * string, otherwise `null`. Strict: case-sensitive on the prefix, hex must
 * be 3 or 6 digits with a leading `#`.
 */
export function parseImageColorMarker(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = MARKER_RE.exec(value)
  return match ? (match[1] ?? null) : null
}

/** Convenience predicate. */
export function isImageColorMarker(value: unknown): value is string {
  return parseImageColorMarker(value) !== null
}

/** Build the marker string for a given hex colour. */
export function makeImageColorMarker(hex: string): string {
  return `<STATICIMAGE_COLOR_${hex}>`
}
