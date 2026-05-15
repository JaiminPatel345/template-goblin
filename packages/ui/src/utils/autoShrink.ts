/**
 * Auto-shrink helpers for static field rects (#42).
 *
 * Static content has a known rendered size at design time — image natural
 * dimensions, text width/height at the current font. When the user draws a
 * larger rect than the content occupies the surplus is wasted whitespace.
 * These helpers compute the smallest rect that still contains the content,
 * but they NEVER grow beyond what the user drew (the issue's hard constraint).
 *
 * Both helpers are pure: no Fabric, no store. Caller is responsible for
 * dispatching the resulting `{width, height}` via `updateField`.
 */

/**
 * Default horizontal padding (per side) when computing the shrunk text
 * width.
 *
 * MUST be ≥ the renderer's own innerPad (`pushTextLabel.ts:61` uses 6pt
 * on each side, so effective text width = rect_w − 12). If our shrunk
 * rect is exactly `naturalTextWidth + 6*2`, the renderer's labelW lands
 * at naturalTextWidth and any rounding / sub-pixel hinting tips it into
 * truncate-mode. We add 2pt safety per side on top, giving 8 = 6 + 2.
 */
const DEFAULT_INNER_PAD = 8
const DEFAULT_MIN_W = 10

/** Shared 2D context for off-screen text measurement. */
let _ctx: CanvasRenderingContext2D | null = null
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (_ctx) return _ctx
  const cv = document.createElement('canvas')
  _ctx = cv.getContext('2d')
  return _ctx
}

/**
 * Shrink a static image's rect on the WIDTH axis only, preserving the
 * user-drawn height. User feedback on #42: "height must remain same as
 * user draw" — height is an intentional layout choice, never auto-modified.
 *
 * Strategy: keep `currentH`; pick `width = naturalW × currentH / naturalH`
 * (the width that gives the image its natural aspect at the user's height).
 * If that's bigger than the user's rect (user drew narrower than aspect),
 * leave the rect alone — never grow.
 */
export function fitStaticImageRect(
  currentW: number,
  currentH: number,
  naturalW: number,
  naturalH: number,
): { width: number; height: number } {
  if (
    currentW <= 0 ||
    currentH <= 0 ||
    naturalW <= 0 ||
    naturalH <= 0 ||
    !Number.isFinite(currentW) ||
    !Number.isFinite(currentH) ||
    !Number.isFinite(naturalW) ||
    !Number.isFinite(naturalH)
  ) {
    return { width: currentW, height: currentH }
  }
  const widthAtCurrentHeight = (naturalW * currentH) / naturalH
  if (widthAtCurrentHeight < currentW) {
    return { width: widthAtCurrentHeight, height: currentH }
  }
  return { width: currentW, height: currentH }
}

export interface MeasureStaticTextRectOptions {
  innerPad?: number
  minW?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
}

/**
 * Shrink a static text rect on the WIDTH axis only, preserving the
 * user-drawn height. User feedback on #42: the height represents the user's
 * intentional layout choice and must never be auto-modified; only the empty
 * space to the right of the text gets trimmed away.
 *
 * Strategy: measure the text at its natural single-line width (no wrap).
 * If that natural width + pad fits inside the user's current width, trim
 * width to that. If the natural width already meets or exceeds the user's
 * rect, leave width alone — the existing overflow-mode (truncate / dynamic
 * font) handles the over-set case.
 *
 * The measurement context's `font` is built with `fontWeight` + `fontStyle`
 * so it matches `Textbox`'s own renderer (bold text is wider than normal at
 * the same fontSize — getting this wrong is what caused "Jaimin" to render
 * as "Jai" after a shrink: the helper measured at normal weight but the
 * renderer drew at bold).
 *
 * Returns the input rect unchanged when the text is empty or when DOM
 * measurement isn't available (SSR / tests without jsdom canvas).
 */
export function measureStaticTextRect(
  text: string,
  fontFamily: string,
  fontSize: number,
  // lineHeight kept for signature stability — height is no longer modified
  // so the value is unused in the new implementation.
  _lineHeight: number,
  currentW: number,
  currentH: number,
  opts: MeasureStaticTextRectOptions = {},
): { width: number; height: number } {
  const innerPad = opts.innerPad ?? DEFAULT_INNER_PAD
  const minW = opts.minW ?? DEFAULT_MIN_W
  const fontWeight = opts.fontWeight ?? 'normal'
  const fontStyle = opts.fontStyle ?? 'normal'

  if (!text || currentW <= 0 || currentH <= 0 || fontSize <= 0) {
    return { width: currentW, height: currentH }
  }
  const ctx = getMeasureCtx()
  if (!ctx) return { width: currentW, height: currentH }

  // CSS font shorthand: `<style> <weight> <size> <family>`. Skipping
  // weight/style here is the bug that mismeasured bold text — keep this
  // in sync with Textbox's options in `pushTextLabel.ts`.
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
  const naturalW = ctx.measureText(text).width
  // Ceil before adding pad so sub-pixel measurement doesn't strip a
  // fraction of a glyph in the renderer pass.
  const targetW = Math.max(minW, Math.ceil(naturalW) + innerPad * 2)

  // Width never grows — leave the rect alone when the text already fills
  // or overflows the user's rect (the user has chosen the wrap width).
  if (targetW >= currentW) {
    return { width: currentW, height: currentH }
  }
  return { width: targetW, height: currentH }
}
