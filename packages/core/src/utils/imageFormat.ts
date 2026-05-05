/**
 * Detect the image format of a buffer by inspecting its leading magic bytes.
 *
 * PDFKit's `doc.image()` accepts only PNG and JPEG. Anything else triggers a
 * cryptic "Unknown image format" deep inside PDFKit, with no field context.
 * We sniff up front so callers can surface a precise error.
 *
 * @param buffer - Image bytes to inspect
 * @returns `'png'`, `'jpeg'`, or `null` when the bytes are neither
 */
export function sniffImageFormat(buffer: Buffer): 'png' | 'jpeg' | null {
  if (!buffer || buffer.length < 4) return null

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png'
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg'
  }

  return null
}
