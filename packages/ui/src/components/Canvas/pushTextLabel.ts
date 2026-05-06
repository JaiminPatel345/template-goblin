/**
 * pushTextLabel — append the centred body-text Textbox child for a non-image,
 * non-table field's auto-fit label. Extracted from `buildGroupChildren.ts`
 * (Hard Rule #11). The function mutates the `children` array in place so the
 * caller's draw order stays bgRect → image/table → label.
 */
import { Textbox } from 'fabric'
import type { FabricObject } from 'fabric'
import type { FieldDefinition } from '@template-goblin/types'
import { fitFontSize } from './fitFontSize.js'

/** Per-type colour tokens from the theme — `pushTextLabel` only needs `text`. */
export interface LabelColorTokens {
  fill: string
  stroke: string
  text: string
  selectedFill: string
  selectedStroke: string
}

/**
 * Push a Textbox child into `children` for the given field's centred label.
 * No-op when the rect is too small to host a >= 8pt font.
 */
export function pushTextLabel(
  children: FabricObject[],
  field: FieldDefinition,
  label: string,
  w: number,
  h: number,
  colors: LabelColorTokens,
): void {
  const innerPad = 6
  const labelW = Math.max(1, w - innerPad * 2)
  const labelH = Math.max(1, h - innerPad * 2)
  const textStyle =
    field.type === 'text' && field.style && typeof field.style === 'object'
      ? (field.style as Partial<{
          fontFamily: string
          fontSize: number
          fontSizeDynamic: boolean
          color: string
          fontWeight: 'normal' | 'bold'
          fontStyle: 'normal' | 'italic'
          textDecoration: 'none' | 'underline' | 'line-through'
          align: 'left' | 'center' | 'right'
          verticalAlign: 'top' | 'middle' | 'bottom'
          lineHeight: number
        }>)
      : null
  const fontFamily = textStyle?.fontFamily || 'sans-serif'
  // GH #73: only static text may auto-grow the label to a max-fit preview.
  // Dynamic text is WYSIWYG with the authored `fontSize`.
  const userFontSize =
    typeof textStyle?.fontSize === 'number' && textStyle.fontSize > 0 ? textStyle.fontSize : null
  const isDynamicSource = field.source?.mode === 'dynamic'
  const autoFit = !isDynamicSource && textStyle?.fontSizeDynamic === true
  const fitted = fitFontSize(label, labelW, labelH, fontFamily)
  const fontSize = autoFit || userFontSize === null ? fitted : Math.min(userFontSize, fitted)
  if (fontSize < 8) return

  const verticalAlign = textStyle?.verticalAlign || 'middle'
  const top = verticalAlign === 'top' ? innerPad : verticalAlign === 'bottom' ? h - innerPad : h / 2
  const originY = verticalAlign === 'top' ? 'top' : verticalAlign === 'bottom' ? 'bottom' : 'center'
  children.push(
    new Textbox(label, {
      left: w / 2,
      top,
      width: labelW,
      fontSize,
      fontFamily,
      fill: textStyle?.color || colors.text,
      fontWeight: textStyle?.fontWeight || 'normal',
      fontStyle: textStyle?.fontStyle || 'normal',
      underline: textStyle?.textDecoration === 'underline',
      linethrough: textStyle?.textDecoration === 'line-through',
      textAlign: textStyle?.align || 'center',
      selectable: false,
      evented: false,
      originX: 'center',
      originY,
      splitByGrapheme: false,
      lineHeight: textStyle?.lineHeight && textStyle.lineHeight > 0 ? textStyle.lineHeight : 1.2,
    }),
  )
}
