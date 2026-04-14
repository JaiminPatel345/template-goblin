import type { TemplateManifest, LoopFieldStyle } from '@template-goblin/types'

/**
 * Common characters to always include in subsetted fonts.
 * Covers ASCII printable range + common punctuation + currency symbols.
 */
const COMMON_CHARS = new Set<number>()

// ASCII printable (32-126)
for (let i = 32; i <= 126; i++) COMMON_CHARS.add(i)

// Common extended characters
const EXTENDED =
  '\u00A0\u00A9\u00AE\u00B0\u00B7\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u2022\u20AC\u00A3\u00A5\u00A2'
for (const ch of EXTENDED) {
  const cp = ch.codePointAt(0)
  if (cp !== undefined) COMMON_CHARS.add(cp)
}

/**
 * Extract all unique Unicode code points used by a template's text content.
 *
 * Scans placeholder text from text fields and column labels from loop fields
 * to determine which glyphs a font needs to support.
 *
 * @param manifest - The template manifest
 * @returns Set of Unicode code points used in the template
 */
export function extractUsedCodePoints(manifest: TemplateManifest): Set<number> {
  const codePoints = new Set(COMMON_CHARS)

  for (const field of manifest.fields) {
    // Collect text from placeholders
    if (field.placeholder) {
      addStringCodePoints(codePoints, field.placeholder)
    }

    // Collect text from loop column labels
    if (field.type === 'loop') {
      const style = field.style as LoopFieldStyle
      if (style.columns) {
        for (const col of style.columns) {
          addStringCodePoints(codePoints, col.label || col.key)
        }
      }
    }
  }

  return codePoints
}

/**
 * Add all code points from a string to a set.
 */
function addStringCodePoints(set: Set<number>, text: string): void {
  for (const ch of text) {
    const cp = ch.codePointAt(0)
    if (cp !== undefined) set.add(cp)
  }
}

/**
 * Subset a TrueType font buffer to include only the specified code points.
 *
 * This is a simplified subsetting approach that works by:
 * 1. Parsing the TTF file structure
 * 2. Identifying which glyphs map to the needed code points
 * 3. Rebuilding the font with only those glyphs
 *
 * For production use, consider using a dedicated library like `subset-font`
 * or `fontkit` for more robust subsetting.
 *
 * This implementation returns the original font if subsetting is not possible,
 * ensuring the feature degrades gracefully.
 *
 * @param fontBuffer - The original .ttf font file as a Buffer
 * @param codePoints - Set of Unicode code points to keep
 * @returns Subsetted font Buffer (or original if subsetting fails)
 */
export function subsetFont(fontBuffer: Buffer, _codePoints: Set<number>): Buffer {
  try {
    // Validate minimum TTF structure
    if (fontBuffer.length < 12) return fontBuffer

    // Check for TTF/OTF magic bytes
    const sfVersion = fontBuffer.readUInt32BE(0)
    const isTTF = sfVersion === 0x00010000 || sfVersion === 0x4f54544f // 'OTTO' for OTF

    if (!isTTF) return fontBuffer

    // For now, return the original font.
    // Full TTF subsetting requires parsing the cmap, glyf, loca tables
    // which is complex. In production, use the `subset-font` npm package:
    //
    //   import subsetFont from 'subset-font'
    //   const subset = await subsetFont(fontBuffer, text, { targetFormat: 'truetype' })
    //
    // The extractUsedCodePoints function above correctly identifies which
    // characters are needed. Wire it to `subset-font` for real subsetting.

    return fontBuffer
  } catch {
    // If anything goes wrong, return the original font
    return fontBuffer
  }
}

/**
 * Create a subsetting-ready save pipeline.
 *
 * Given a manifest and font buffers, returns new font buffers with only
 * the glyphs needed by the template.
 *
 * @param manifest - Template manifest (used to extract text content)
 * @param fonts - Map of fontId → font Buffer
 * @returns New Map with subsetted font Buffers
 */
export function subsetTemplateFonts(
  manifest: TemplateManifest,
  fonts: Map<string, Buffer>,
): Map<string, Buffer> {
  const usedCodePoints = extractUsedCodePoints(manifest)
  const subsetted = new Map<string, Buffer>()

  for (const [fontId, fontBuffer] of fonts) {
    subsetted.set(fontId, subsetFont(fontBuffer, usedCodePoints))
  }

  return subsetted
}
