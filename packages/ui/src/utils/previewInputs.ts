/**
 * Helpers for the PreviewDialog's image upload thumbnails (#86).
 *
 * Pre-#86 this module also resolved the per-page background inputs the
 * HTML preview pipeline consumed; that pipeline is gone (the preview now
 * runs the real `template-goblin` renderer in-browser), so only the
 * thumbnail map remains. Pure — no React, no store.
 */

/**
 * Sniff the image MIME type from the first few bytes of an uploaded buffer.
 * Falls through to `null` if nothing matches — caller defaults to
 * `image/png`. Covers PNG/JPEG/GIF/WEBP.
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  // GIF: 47 49 46 38 ...
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

/**
 * Build a `filename → dataUrl` map covering both static images (already
 * stored as data URLs) and dynamic-image placeholders (stored as raw
 * `ArrayBuffer`s). Used by the upload-row thumbnails. Static URLs win on
 * key collision.
 */
export function buildImageDataUrlMap(
  staticImageDataUrls: ReadonlyArray<readonly [string, string]> | Map<string, string>,
  placeholderBuffers: Map<string, ArrayBuffer>,
): Map<string, string> {
  const map = new Map<string, string>()
  const staticEntries =
    staticImageDataUrls instanceof Map
      ? Array.from(staticImageDataUrls.entries())
      : staticImageDataUrls
  for (const [filename, dataUrl] of staticEntries) map.set(filename, dataUrl)
  for (const [filename, buffer] of placeholderBuffers) {
    if (map.has(filename)) continue
    try {
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0)
      const base64 = btoa(binary)
      const mime = sniffImageMime(bytes) ?? 'image/png'
      map.set(filename, `data:${mime};base64,${base64}`)
    } catch {
      // Corrupt buffer — skip; the upload row falls back to a blank thumb.
    }
  }
  return map
}
