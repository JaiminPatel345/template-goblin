/**
 * Tiny escaping helpers shared by the preview renderers. Extracted so the
 * orchestrator (`previewGenerator.ts`), field renderers, and any future
 * preview-related code don't have to redefine them.
 */

/** Escape text for HTML body / attribute insertion. */
export function esc(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Sanitise a value going into a CSS property. Numbers pass through; strings
 * must match a conservative allowlist of CSS-safe characters or fall back
 * to '0'. Prevents any user-supplied colour / alignment / font-family from
 * smuggling out of its declaration.
 */
export function sc(v: unknown): string {
  if (typeof v === 'number') return String(v)
  if (typeof v !== 'string') return '0'
  return /^[a-zA-Z0-9#.,\s%-]+$/.test(v) ? v : '0'
}
