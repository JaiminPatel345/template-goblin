/**
 * Browser-side text-fitting used by the preview renderer.
 *
 * Mirrors `fitFontSize` in `Canvas/fabricUtils.ts` so the printed PDF lays
 * out text the same way as the canvas. Lives in its own module so the
 * preview generator can stay under the 300-line cap (CLAUDE.md Hard Rule
 * #11). Consuming the canvas helper directly would force the preview
 * module to import Fabric.js, which is undesirable.
 */

/**
 * Cached 2D context for measuring text. Reused across all `fitFontSize`
 * calls because creating a fresh canvas per call would dominate preview
 * generation time on templates with many text fields.
 */
let _measureCtx: CanvasRenderingContext2D | null = null
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (_measureCtx) return _measureCtx
  const cv = document.createElement('canvas')
  _measureCtx = cv.getContext('2d')
  return _measureCtx
}

/**
 * Fit font size to a bounding rect using greedy word-wrap and binary
 * search. Returns the largest integer size in `[6, min(rectHeight*0.9, 200)]`
 * such that the wrapped text fits within `rectWidth × rectHeight`.
 */
export function fitFontSize(
  text: string,
  rectWidth: number,
  rectHeight: number,
  fontFamily: string,
  lineHeightFactor: number,
): number {
  if (!text || rectWidth <= 0 || rectHeight <= 0) return 6
  const ctx = getMeasureCtx()
  if (!ctx) return Math.max(6, Math.min(200, Math.floor(rectHeight * 0.7)))

  const upper = Math.max(6, Math.min(200, Math.floor(rectHeight * 0.9)))
  let lo = 6
  let hi = upper
  let best = 6
  const lh = lineHeightFactor > 0 ? lineHeightFactor : 1.2

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    ctx.font = `${mid}px ${fontFamily}`
    const lines = wrapToLines(ctx, text, rectWidth)
    const totalH = lines.length * mid * lh
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
