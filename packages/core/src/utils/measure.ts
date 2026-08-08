import type PDFDocument from 'pdfkit'

/**
 * Result of measuring text within a bounding box.
 */
export interface MeasureResult {
  /** The wrapped lines of text that fit within the bounds */
  lines: string[]
  /** Whether the full text fits within the bounding box */
  fits: boolean
  /** The actual font size used (may be smaller than original if dynamic shrink applied) */
  fontSize: number
}

/**
 * Break a single line of text into wrapped lines that fit within maxWidth.
 *
 * Wraps at word boundaries. If a single word exceeds maxWidth, breaks mid-word.
 *
 * @param doc - PDFKit document (used for text width measurement)
 * @param text - The text to wrap
 * @param maxWidth - Maximum width in points
 * @returns Array of wrapped lines
 */
export function wrapText(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return ['']

  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('')
      continue
    }

    const words = paragraph.split(/\s+/)
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = doc.widthOfString(testLine)

      if (testWidth <= maxWidth) {
        currentLine = testLine
      } else if (!currentLine) {
        // REQ: Single word wider than box — break mid-word
        const broken = breakWord(doc, word, maxWidth)
        lines.push(...broken.slice(0, -1))
        currentLine = broken[broken.length - 1] ?? ''
      } else {
        lines.push(currentLine)
        // Check if the word itself fits on a new line
        const wordWidth = doc.widthOfString(word)
        if (wordWidth <= maxWidth) {
          currentLine = word
        } else {
          const broken = breakWord(doc, word, maxWidth)
          lines.push(...broken.slice(0, -1))
          currentLine = broken[broken.length - 1] ?? ''
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines.length > 0 ? lines : ['']
}

/**
 * Break a single word into parts that each fit within maxWidth.
 *
 * @param doc - PDFKit document
 * @param word - The word to break
 * @param maxWidth - Maximum width in points
 * @returns Array of word fragments
 */
function breakWord(
  doc: InstanceType<typeof PDFDocument>,
  word: string,
  maxWidth: number,
): string[] {
  const parts: string[] = []
  let current = ''

  for (const char of word) {
    const testWidth = doc.widthOfString(current + char)
    if (testWidth > maxWidth && current) {
      parts.push(current)
      current = char
    } else {
      current += char
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

/**
 * Measure text within a bounding box at a given font size.
 *
 * Wraps text, checks if all lines fit within maxRows, and returns
 * the lines along with whether the text fits.
 *
 * @param doc - PDFKit document (used for text measurement)
 * @param text - Text to measure
 * @param fontSize - Font size in points
 * @param maxWidth - Maximum width in points
 * @param maxRows - Maximum number of lines allowed
 * @returns MeasureResult with lines, fits flag, and fontSize
 */
export function measureText(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  fontSize: number,
  maxWidth: number,
  maxRows: number,
): MeasureResult {
  doc.fontSize(fontSize)

  const lines = wrapText(doc, text, maxWidth)
  const fits = lines.length <= maxRows

  return {
    lines,
    fits,
    fontSize,
  }
}

/**
 * Truncate lines to fit within maxRows, appending ellipsis to the last visible line.
 *
 * GH #91 \u2014 content NEVER crosses the rect, and we cut characters from the
 * END at a character boundary with no ellipsis. Pre-#91 we appended `\u2026`,
 * which the user explicitly didn't want.
 *
 * @param doc - PDFKit document
 * @param lines - All wrapped lines
 * @param maxRows - Maximum number of lines to show
 * @param maxWidth - Maximum width for the last line
 * @returns Truncated lines \u2014 last line cut at a character boundary so it
 *          fits within `maxWidth`. No ellipsis.
 */
export function truncateLines(
  doc: InstanceType<typeof PDFDocument>,
  lines: string[],
  maxRows: number,
  maxWidth: number,
): string[] {
  if (maxRows <= 0) return []
  if (lines.length <= maxRows) return lines

  const truncated = lines.slice(0, maxRows)
  const lastIndex = truncated.length - 1
  let lastLine = truncated[lastIndex] ?? ''

  // Trim last line at a character boundary until it fits the rect width.
  // No ellipsis \u2014 the user wants the literal characters that fit.
  while (lastLine && doc.widthOfString(lastLine) > maxWidth) {
    lastLine = lastLine.slice(0, -1)
  }

  truncated[lastIndex] = lastLine
  return truncated
}
