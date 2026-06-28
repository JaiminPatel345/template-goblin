/**
 * pushTextLabel — append a centred Textbox child for a text field's body
 * label. Extracted from `buildGroupChildren.ts` (Hard Rule #11). Mutates
 * `children` in place so the caller's draw order stays bgRect →
 * image/table → label.
 *
 * GH #91 — text NEVER crosses the rect on canvas:
 *   - Render at the authored `fontSize` (no max-fit auto-grow, even for
 *     static text — the pre-#73 max-fit behaviour was reverted for static
 *     at the user's request: "max-fit do not change static element").
 *   - For dynamic text fields with `overflowMode: 'dynamic_font'`, shrink
 *     down to `fontSizeMin` until the wrapped text fits the rect; if it
 *     still doesn't fit, fall through to truncation.
 *   - For 'truncate' (default for static text and explicit dynamic
 *     selection), keep the authored size and cut characters from the END
 *     at a character boundary on the last visible line — no ellipsis.
 *   - We pre-wrap on a 2D canvas context and pass the trimmed string
 *     (with explicit `\n` line breaks) to a Fabric Textbox. Same outcome
 *     as the PDFKit renderer for the same inputs.
 */
import { Textbox, Group, Rect } from 'fabric'
import type { FabricObject } from 'fabric'
import type { FieldDefinition } from '@template-goblin/types'
import { resolveTextStyle, fitDynamicFontSize, computeVisibleText } from './textMeasure.js'

/** Per-type colour tokens from the theme — `pushTextLabel` only needs `text`. */
export interface LabelColorTokens {
  fill: string
  stroke: string
  text: string
  selectedFill: string
  selectedStroke: string
}

/**
 * Push a Textbox child for the given field's centred label, honouring the
 * #91 overflow contract (truncate cuts at character boundary, dynamic-font
 * shrinks to `fontSizeMin` then truncates).
 */
export function pushTextLabel(
  children: FabricObject[],
  field: FieldDefinition,
  label: string,
  w: number,
  h: number,
  colors: LabelColorTokens,
): void {
  // #167 WYSIWYG parity — the PDF renderer (`renderText`) wraps, caps, and
  // positions text against the FULL field box with no inner padding. The
  // canvas must use the same box, otherwise the preview's line count and
  // wrap points drift from the generated PDF (a 6px inset changes
  // `floor(height / lineHeight)` at boundary sizes, e.g. 1 line vs 2).
  const labelW = Math.max(1, w)
  const labelH = Math.max(1, h)
  const textStyle = resolveTextStyle(field)
  if (textStyle.fontSize < 4) return // pathological — nothing readable

  const isDynamicSource = field.source?.mode === 'dynamic'
  const useDynamicFont = isDynamicSource && textStyle.overflowMode === 'dynamic_font'

  // Pick the rendered font size. Dynamic-font shrinks to `fontSizeMin`;
  // truncate-mode keeps the authored size.
  const fontSize = useDynamicFont
    ? fitDynamicFontSize(label, textStyle, labelW, labelH)
    : textStyle.fontSize

  // Always run the truncation pass against the chosen font size — even
  // dynamic-font may not fit at `fontSizeMin`, in which case we cut.
  const visible = computeVisibleText(label, textStyle, fontSize, labelW, labelH)
  if (!visible) return

  // Anchor the block to the full box edges (PDF parity).
  // We explicitly calculate the block height to match the PDF renderer (`text.ts`).
  const linesCount = visible.split('\n').length
  const lineHeightPt = fontSize * textStyle.lineHeight
  const blockHeight = linesCount * lineHeightPt

  let blockTop: number
  switch (textStyle.verticalAlign) {
    case 'middle':
      blockTop = (h - blockHeight) / 2
      break
    case 'bottom':
      blockTop = h - blockHeight
      break
    case 'top':
    default:
      blockTop = 0
      break
  }

  // To fix "text seem above then center", we match PDFKit's exact optical centering.
  // PDFKit draws the glyph at the top of the slot, plus `(lineHeightPt - ascent) / 2`.
  // Fabric draws the glyph centered in the slot by default.
  // We'll place the Textbox's top exactly at `blockTop` which perfectly bounds the slots.

  const textbox = new Textbox(visible, {
    left: w / 2,
    top: blockTop,
    width: labelW,
    fontSize,
    fontFamily: textStyle.fontFamily,
    fill: textStyle.color || colors.text,
    fontWeight: textStyle.fontWeight,
    fontStyle: textStyle.fontStyle,
    underline: textStyle.textDecoration === 'underline',
    linethrough: textStyle.textDecoration === 'line-through',
    textAlign: textStyle.align,
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'top',
    splitByGrapheme: false,
    lineHeight: textStyle.lineHeight,
  })

  const boundsRect = new Rect({
    left: 0,
    top: 0,
    width: labelW,
    height: labelH,
    originX: 'left',
    originY: 'top',
    fill: 'transparent',
    stroke: 'transparent',
    selectable: false,
    evented: false,
  })

  const textGroup = new Group([boundsRect, textbox], {
    left: 0,
    top: 0,
    width: labelW,
    height: labelH,
    originX: 'left',
    originY: 'top',
    selectable: false,
    evented: false,
    clipPath: new Rect({
      left: 0,
      top: 0,
      width: labelW,
      height: labelH,
      originX: 'center',
      originY: 'center',
      absolutePositioned: false,
    }),
  })

  children.push(textGroup)
}
