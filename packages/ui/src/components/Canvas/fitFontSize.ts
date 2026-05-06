/**
 * fitFontSize — text-fit helper used by the canvas label renderer (REQ-045)
 * and by `wireDragResizeEvents` to write back the visually-fitted size to the
 * store after a static-text drag/resize. Extracted from `fabricUtils.ts`
 * (Hard Rule #11: oversized files split when touched).
 *
 * Returns the largest integer size in `[8, min(LABEL_MAX_FONT_SIZE,
 * rectHeight * 0.8)]` such that the wrapped text fits within
 * `rectWidth × rectHeight`. Pure — no Fabric dependency.
 */

/** Cached 2D context for text measurement. */
let _measureCtx: CanvasRenderingContext2D | null = null
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (_measureCtx) return _measureCtx
  const cv = document.createElement('canvas')
  _measureCtx = cv.getContext('2d')
  return _measureCtx
}

/** Maximum font size the label auto-fit will return. */
const LABEL_MAX_FONT_SIZE = 160

/**
 * Fit font size to a bounding rect using greedy word-wrap and binary search.
 */
export function fitFontSize(
  text: string,
  rectWidth: number,
  rectHeight: number,
  fontFamily: string,
): number {
  if (!text || rectWidth <= 0 || rectHeight <= 0) return 8
  const ctx = getMeasureCtx()
  if (!ctx) return Math.max(8, Math.min(LABEL_MAX_FONT_SIZE, Math.floor(rectHeight * 0.6)))

  const upper = Math.max(8, Math.min(LABEL_MAX_FONT_SIZE, Math.floor(rectHeight * 0.8)))
  let lo = 8
  let hi = upper
  let best = 8
  const lineHeightFactor = 1.2

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    ctx.font = `${mid}px ${fontFamily}`
    const lines = wrapToLines(ctx, text, rectWidth)
    const totalH = lines.length * mid * lineHeightFactor
    const maxW = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0)
    if (maxW <= rectWidth && totalH <= rectHeight) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
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
