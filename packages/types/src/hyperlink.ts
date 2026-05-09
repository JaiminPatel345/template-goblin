/**
 * Hyperlink — optional clickable region attached to any field (#87).
 *
 * Two flavours, picked by `mode`:
 *   - `static`: a literal URL baked into the manifest. Round-trips with
 *     the `.tgbl` archive, validated at load time.
 *   - `dynamic`: a `jsonKey` resolved at render time from
 *     `InputJSON.texts[jsonKey]`. Each row of input data may carry its
 *     own URL string. An empty / missing value yields no clickable
 *     region (no error).
 *
 * Allowed protocols: `https`, `http`, `mailto`, `tel`. Anything else
 * (e.g. `ftp`, `javascript`, custom schemes) is rejected as
 * `INVALID_DATA_TYPE`.
 *
 * Tables: a hyperlink on a `TableField` makes the WHOLE table's
 * bounding rect clickable — there is no per-row or per-column variant.
 * Per-cell linking would require a far more involved layout-time
 * coordinate calculation and is out of scope for v1.
 */

/** A literal URL pinned into the manifest. */
export interface StaticHyperlink {
  mode: 'static'
  url: string
}

/** A `texts[jsonKey]` lookup resolved against runtime input data. */
export interface DynamicHyperlink {
  mode: 'dynamic'
  jsonKey: string
}

export type Hyperlink = StaticHyperlink | DynamicHyperlink

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tel:'])

/**
 * True when `value` is a non-empty string whose URL parses and uses one
 * of the allowed protocols. Used by both manifest validation (static
 * URL) and input-data validation (dynamic URL) so the rules are
 * identical at design time and at runtime.
 *
 * Empty strings return `false`. Callers that want "empty == no link"
 * semantics must short-circuit on emptiness BEFORE calling this — the
 * function only judges shape, not absence.
 */
export function isValidHyperlinkUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  return ALLOWED_PROTOCOLS.has(parsed.protocol)
}

/** Type guard for the static variant. */
export function isStaticHyperlink(h: Hyperlink): h is StaticHyperlink {
  return h.mode === 'static'
}

/** Type guard for the dynamic variant. */
export function isDynamicHyperlink(h: Hyperlink): h is DynamicHyperlink {
  return h.mode === 'dynamic'
}
