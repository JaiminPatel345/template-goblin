/**
 * buildGroupChildren — build the Fabric children for a single field's
 * Group. Extracted from `fabricUtils.ts` to honour Hard Rule #11
 * (oversized files split when touched).
 *
 * Conditional fill (REQ-047, IMP-3 / IMP-4):
 *  - Static fields (any type): fill rect uses `fill: 'transparent'`.
 *  - Image field with a resolved placeholder/static image: `'transparent'`.
 *  - All other dynamic fields: per-type colour token.
 *
 * Live preview data (#79): when `data` is provided, dynamic text fields
 * render with `data.texts[jsonKey]` (when present) instead of the
 * placeholder fallback, and dynamic table rows render against
 * `data.tables[jsonKey]`. Pass `null` to render the design-time preview.
 */
import { Rect } from 'fabric'
import type { FabricObject, FabricImage } from 'fabric'
import type { FieldDefinition, InputJSON, TextFieldStyle } from '@template-goblin/types'
import { FIELD_COLORS } from '../../theme/fieldColors.js'
import { fieldCanvasLabel } from './fieldLabel.js'
import { shouldRenderFillRect } from './rectFill.js'
import { buildTableCanvasParts } from './tableCanvasParts.js'
import { pushTextLabel } from './pushTextLabel.js'
import { resolveImagePaint, loadFabricImage, type ImageResolver } from './fabricImage.js'

import { resolveUiField } from '../../utils/conditionalStyle.js'

// Re-exported so existing imports via `fabricUtils` keep resolving.
export { loadFabricImage, type ImageResolver }

/**
 * Build the child objects for a field Group.
 */
export function buildGroupChildren(
  rawField: FieldDefinition,
  resolveImage: ImageResolver,
  onAsyncUpdate?: (img: FabricImage, placeholderId: string) => void,
  data: InputJSON | null = null,
): FabricObject[] {
  const field = resolveUiField(rawField, data)
  const colors = FIELD_COLORS[field.type]
  const w = field.width
  const h = field.height

  // Resolve the image-field paint shape: a colour fill (#81) or a baked image.
  const { imageDataUrl, imageColor } = resolveImagePaint(field, resolveImage, data)

  const placeholderResolved = imageDataUrl !== null
  const tableRowsForRender = lookupTableRows(field, data)
  // GH #79: a table with body rows being painted from runtime data carries
  // its own visual weight (header band, row backgrounds, cell labels) — the
  // per-type design-time fill colour bleeding through where rows don't fill
  // the rect just looks like a stray colour band. Treat "table with rows"
  // the same way `shouldRenderFillRect` treats a resolved image: bgRect
  // goes transparent.
  const tableHasBodyRows =
    field.type === 'table' &&
    (field.style?.columns?.length ?? 0) > 0 &&
    !!tableRowsForRender &&
    tableRowsForRender.length > 0
  // GH #81: solid-colour image fields paint the user's colour ON the
  // bgRect itself — no per-type design-time tint, no separate child.
  const shouldFill =
    !tableHasBodyRows && !imageColor && shouldRenderFillRect(field, { placeholderResolved })

  // #167 — a text field can carry an explicit background fill. It wins over
  // the per-type design-time tint (the same way a solid-colour image's
  // colour does) so the editor canvas matches the rendered PDF (WYSIWYG).
  let textBgColor: string | null = null
  if (field.type === 'text') {
    const bg = (field.style as TextFieldStyle).backgroundColor
    if (typeof bg === 'string' && bg.length > 0) textBgColor = bg
  }

  // 1. Background rect — always present so the Group has a stable bounding
  //    box and hit-testing works (Fabric needs a non-zero area; fill:
  //    'transparent' still participates in hit-detection unlike fill: null
  //    or fill: '').
  const defaultFill = imageColor ?? textBgColor ?? (shouldFill ? colors.fill : 'transparent')
  const defaultStroke = colors.stroke
  const defaultStrokeWidth = 1
  // When the fill is the user's REAL colour (a text background #167 or a
  // solid-colour image #81) it appears in the PDF, which paints a SQUARE
  // rect — so drop the 2px design-time rounding to match. The rounding
  // stays only for the transparent / design-tint chrome the PDF never shows.
  const userControlledFill = imageColor !== null || textBgColor !== null
  const corner = userControlledFill ? 0 : 2
  const bgRect = new Rect({
    left: 0,
    top: 0,
    width: w,
    height: h,
    fill: defaultFill,
    stroke: defaultStroke,
    strokeWidth: defaultStrokeWidth,
    strokeUniform: true,
    rx: corner,
    ry: corner,
    selectable: false,
    evented: false,
    originX: 'left',
    originY: 'top',
  })
  bgRect.__defaultFill = defaultFill
  bgRect.__defaultStroke = defaultStroke
  bgRect.__defaultStrokeWidth = defaultStrokeWidth
  // Solid-colour image (#81) or a text field's background fill (#167): the
  // bgRect's fill IS the user's chosen colour, not a design-time tint. Mark
  // it so `applySelectionVisuals` doesn't paint over it with the selection
  // emphasis fill.
  bgRect.__userControlledFill = userControlledFill

  const children: FabricObject[] = [bgRect]

  // 2. Placeholder / static image (asynchronous — created synchronously
  //    using a dummy element; the caller is responsible for re-rendering
  //    after load). Lightweight placeholder is added if the data URL is
  //    available; the real bitmap swaps in via `onAsyncUpdate`.
  if (placeholderResolved && imageDataUrl) {
    const imgPlaceholder = new Rect({
      left: 0,
      top: 0,
      width: w,
      height: h,
      fill: 'rgba(0,0,0,0.05)',
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top',
    })
    imgPlaceholder.__fieldId = `__img_placeholder_${field.id}`
    children.push(imgPlaceholder)

    const imageStyle =
      field.type === 'image' && field.style && typeof field.style === 'object'
        ? (field.style as { fit?: 'fill' | 'contain' | 'cover' })
        : null
    const fit = imageStyle?.fit ?? 'contain'
    const fieldId = field.id
    loadFabricImage(imageDataUrl, w, h, fieldId, fit).then((img) => {
      if (!img || !onAsyncUpdate) return
      onAsyncUpdate(img, `__img_placeholder_${fieldId}`)
    })
  }

  // 2.5 Table column dividers + header labels (GH #38). Done before the
  //     centred body label so a non-empty `style.columns` short-circuits
  //     it — the column-header labels in the band already convey the
  //     field's purpose, and a centred field-name label would clash with
  //     the grid.
  if (field.type === 'table' && field.style?.columns?.length) {
    children.push(...buildTableCanvasParts(field, w, h, tableRowsForRender))
  }

  // 3. Auto-fit label (GH #12) — skipped when an image is rendered, when
  //    the field paints a solid colour fill (#81 — the colour IS the
  //    content; a centred label would obscure it), and for tables that
  //    already drew their column headers.
  const skipBodyLabel =
    placeholderResolved ||
    imageColor !== null ||
    (field.type === 'table' && (field.style?.columns?.length ?? 0) > 0)
  if (!skipBodyLabel) {
    const label = labelFor(field, data)
    if (label) {
      pushTextLabel(children, field, label, w, h, colors)
    }
  }

  return children
}

/**
 * Resolve the on-canvas label for a field. For dynamic text fields we
 * prefer the runtime `data.texts[jsonKey]` so the canvas reflects the
 * right-panel JSON (#79); otherwise we fall back to the design-time
 * placeholder via `fieldCanvasLabel`.
 */
function labelFor(field: FieldDefinition, data: InputJSON | null): string {
  if (field.type === 'text' && field.source?.mode === 'dynamic' && data) {
    const value = data.texts?.[field.source.jsonKey]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return fieldCanvasLabel(field)
}

/**
 * Resolve the table rows the canvas should render. For dynamic tables we
 * read `data.tables[jsonKey]`, falling back to `null` when not provided —
 * `buildTableCanvasParts` interprets `null` as "design-time preview, no
 * body rows".
 */
function lookupTableRows(
  field: FieldDefinition,
  data: InputJSON | null,
): Record<string, string>[] | null {
  if (field.type !== 'table') return null
  if (!data) return null
  if (field.source?.mode !== 'dynamic') return null
  const rows = data.tables?.[field.source.jsonKey]
  return Array.isArray(rows) ? rows : null
}
