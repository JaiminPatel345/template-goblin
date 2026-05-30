/**
 * textMeasure — canvas text-measurement helpers shared by `pushTextLabel`.
 * Extracted to keep that file under the line cap (Hard Rule #11). These wrap /
 * fit / truncate text against a 2D canvas context, mirroring the PDFKit
 * renderer's overflow contract (#91) so the canvas preview matches the PDF.
 */
import type { FieldDefinition } from '@template-goblin/types'

export interface ResolvedTextStyle {
  fontFamily: string
  fontSize: number
  fontSizeMin: number
  color: string | undefined
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline' | 'line-through'
  align: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  lineHeight: number
  overflowMode: 'truncate' | 'dynamic_font'
}

/**
 * Read the field's `style` defensively and apply per-key defaults so the
 * caller can rely on a fully-populated shape.
 */
export function resolveTextStyle(field: FieldDefinition): ResolvedTextStyle {
  const raw: Record<string, unknown> =
    field.type === 'text' && field.style && typeof field.style === 'object'
      ? (field.style as unknown as Record<string, unknown>)
      : {}
  const fontSize = typeof raw.fontSize === 'number' && raw.fontSize > 0 ? raw.fontSize : 12
  const fontSizeMin =
    typeof raw.fontSizeMin === 'number' && raw.fontSizeMin > 0
      ? Math.min(raw.fontSizeMin, fontSize)
      : Math.max(6, fontSize - 4)
  return {
    fontFamily: typeof raw.fontFamily === 'string' ? raw.fontFamily : 'sans-serif',
    fontSize,
    fontSizeMin,
    color: typeof raw.color === 'string' ? raw.color : undefined,
    fontWeight: raw.fontWeight === 'bold' ? 'bold' : 'normal',
    fontStyle: raw.fontStyle === 'italic' ? 'italic' : 'normal',
    textDecoration:
      raw.textDecoration === 'underline'
        ? 'underline'
        : raw.textDecoration === 'line-through'
          ? 'line-through'
          : 'none',
    align: raw.align === 'left' || raw.align === 'right' ? raw.align : 'center',
    verticalAlign:
      raw.verticalAlign === 'top' || raw.verticalAlign === 'bottom' ? raw.verticalAlign : 'middle',
    lineHeight: typeof raw.lineHeight === 'number' && raw.lineHeight > 0 ? raw.lineHeight : 1.2,
    overflowMode: raw.overflowMode === 'dynamic_font' ? 'dynamic_font' : 'truncate',
  }
}

/**
 * Pick the largest font size in `[fontSizeMin, fontSize]` whose wrapped
 * height fits within `labelH`. Returns `fontSizeMin` when nothing fits —
 * `computeVisibleText` will then truncate to whatever still doesn't fit.
 */
export function fitDynamicFontSize(
  text: string,
  style: ResolvedTextStyle,
  labelW: number,
  labelH: number,
): number {
  const ctx = getMeasureCtx()
  if (!ctx || labelW <= 0 || labelH <= 0) return style.fontSize

  let size = style.fontSize
  const min = Math.max(1, style.fontSizeMin)
  while (size >= min) {
    ctx.font = `${size}px ${style.fontFamily}`
    const lines = wrapToLines(ctx, text, labelW)
    const totalH = lines.length * size * style.lineHeight
    if (totalH <= labelH) return size
    size -= 1
  }
  return min
}

/**
 * Compute the visible string at the chosen font size — wrap to `labelW`,
 * keep only as many lines as fit vertically, and char-truncate the last
 * visible line so it fits horizontally. Returns `null` when the rect can't
 * fit even one character at this font size (caller skips rendering).
 */
export function computeVisibleText(
  text: string,
  style: ResolvedTextStyle,
  fontSize: number,
  labelW: number,
  labelH: number,
): string | null {
  const ctx = getMeasureCtx()
  if (!ctx || labelW <= 0 || labelH <= 0) return text

  ctx.font = `${fontSize}px ${style.fontFamily}`
  const lineHeightPt = fontSize * style.lineHeight
  const maxLines = Math.max(1, Math.floor(labelH / lineHeightPt))

  const wrapped = wrapToLines(ctx, text, labelW)
  if (wrapped.length === 0) return null
  if (wrapped.length <= maxLines && fitsOneLine(ctx, wrapped[wrapped.length - 1] ?? '', labelW)) {
    return wrapped.join('\n')
  }

  const visible = wrapped.slice(0, maxLines)
  // Char-boundary truncate the last visible line so it fits the width.
  let last = visible[visible.length - 1] ?? ''
  while (last && ctx.measureText(last).width > labelW) {
    last = last.slice(0, -1)
  }
  if (!last) return visible.length > 1 ? visible.slice(0, -1).join('\n') : null
  visible[visible.length - 1] = last
  return visible.join('\n')
}

function fitsOneLine(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): boolean {
  return ctx.measureText(line).width <= maxWidth
}

let _measureCtx: CanvasRenderingContext2D | null = null
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (_measureCtx) return _measureCtx
  const cv = document.createElement('canvas')
  _measureCtx = cv.getContext('2d')
  return _measureCtx
}

function wrapToLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text]
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (ctx.measureText(test).width <= maxWidth || current === '') {
      current = test
    } else {
      lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines
}
