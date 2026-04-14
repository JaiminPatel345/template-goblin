import type PDFDocument from 'pdfkit'
import type { FieldDefinition, ImageFieldStyle } from '@template-goblin/types'

/**
 * Render an image field onto a PDFKit document within its bounding rectangle.
 *
 * Supports three fit modes: fill, contain, cover.
 * Accepts both Buffer and base64 string inputs.
 *
 * @param doc - PDFKit document
 * @param field - Field definition with position and dimensions
 * @param value - Image data as Buffer or base64 string
 */
export function renderImage(
  doc: InstanceType<typeof PDFDocument>,
  field: FieldDefinition,
  value: Buffer | string,
): void {
  const style = field.style as ImageFieldStyle
  const { x, y, width, height } = field

  // REQ: Support both Buffer and base64 string input
  // Strip data URI prefix if present (e.g., "data:image/png;base64,...")
  let rawValue = value
  if (typeof rawValue === 'string' && rawValue.startsWith('data:')) {
    const commaIndex = rawValue.indexOf(',')
    if (commaIndex !== -1) {
      rawValue = rawValue.slice(commaIndex + 1)
    }
  }
  const imageBuffer = typeof rawValue === 'string' ? Buffer.from(rawValue, 'base64') : rawValue

  // Guard against empty/corrupt image data
  if (imageBuffer.length === 0) return

  switch (style.fit) {
    case 'fill':
      // REQ: Stretch image to fill entire rectangle (may distort)
      doc.image(imageBuffer, x, y, { width, height })
      break

    case 'contain': {
      // REQ: Scale to fit inside rectangle preserving aspect ratio (may have empty space)
      const dims = getContainDimensions(imageBuffer, width, height)
      const offsetX = x + (width - dims.width) / 2
      const offsetY = y + (height - dims.height) / 2
      doc.image(imageBuffer, offsetX, offsetY, {
        width: dims.width,
        height: dims.height,
      })
      break
    }

    case 'cover': {
      // REQ: Scale to cover entire rectangle preserving aspect ratio (may crop)
      // Save graphics state, clip to bounding rect, then draw oversized image
      doc.save()
      doc.rect(x, y, width, height).clip()
      const dims = getCoverDimensions(imageBuffer, width, height)
      const offsetX = x + (width - dims.width) / 2
      const offsetY = y + (height - dims.height) / 2
      doc.image(imageBuffer, offsetX, offsetY, {
        width: dims.width,
        height: dims.height,
      })
      doc.restore()
      break
    }
  }
}

/**
 * Calculate dimensions for "contain" fit mode.
 * Scale image to fit inside the box while preserving aspect ratio.
 */
function getContainDimensions(
  imageBuffer: Buffer,
  boxWidth: number,
  boxHeight: number,
): { width: number; height: number } {
  const imgSize = getImageSize(imageBuffer)
  const scaleX = boxWidth / imgSize.width
  const scaleY = boxHeight / imgSize.height
  const scale = Math.min(scaleX, scaleY)
  return {
    width: imgSize.width * scale,
    height: imgSize.height * scale,
  }
}

/**
 * Calculate dimensions for "cover" fit mode.
 * Scale image to cover the entire box while preserving aspect ratio.
 */
function getCoverDimensions(
  imageBuffer: Buffer,
  boxWidth: number,
  boxHeight: number,
): { width: number; height: number } {
  const imgSize = getImageSize(imageBuffer)
  const scaleX = boxWidth / imgSize.width
  const scaleY = boxHeight / imgSize.height
  const scale = Math.max(scaleX, scaleY)
  return {
    width: imgSize.width * scale,
    height: imgSize.height * scale,
  }
}

/**
 * Extract image dimensions from a buffer.
 *
 * Reads PNG/JPEG headers to get width/height without decoding the full image.
 * Falls back to a default size if format is unrecognized.
 */
function getImageSize(buffer: Buffer): { width: number; height: number } {
  // PNG: width at bytes 16-19, height at bytes 20-23 (big-endian)
  if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)
    return { width, height }
  }

  // JPEG: scan for SOF0/SOF2 marker
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset < buffer.length - 8) {
      if (buffer[offset] === 0xff) {
        const marker = buffer[offset + 1]
        // SOF0 (0xC0) or SOF2 (0xC2) — baseline or progressive
        if (marker !== undefined && (marker === 0xc0 || marker === 0xc2)) {
          const height = buffer.readUInt16BE(offset + 5)
          const width = buffer.readUInt16BE(offset + 7)
          return { width, height }
        }
        // Skip this segment
        const segLength = buffer.readUInt16BE(offset + 2)
        if (segLength < 2) break // Invalid segment, bail out
        offset += 2 + segLength
      } else {
        offset++
      }
    }
  }

  // Fallback: assume square, let PDFKit handle actual rendering
  return { width: 100, height: 100 }
}
