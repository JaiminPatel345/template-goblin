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
import { Rect, FabricImage } from 'fabric'
import type { FabricObject } from 'fabric'
import type { FieldDefinition, InputJSON } from '@template-goblin/types'
import { FIELD_COLORS } from '../../theme/fieldColors.js'
import { fieldCanvasLabel } from './fieldLabel.js'
import { shouldRenderFillRect } from './rectFill.js'
import { buildTableCanvasParts } from './tableCanvasParts.js'
import { pushTextLabel } from './pushTextLabel.js'

/**
 * Resolve an image asset for a field (placeholder or static).
 * Returns the data URL string if available, or null.
 */
export type ImageResolver = (filename: string) => string | null

/**
 * Build the child objects for a field Group.
 */
export function buildGroupChildren(
  field: FieldDefinition,
  resolveImage: ImageResolver,
  onAsyncUpdate?: (img: FabricImage, placeholderId: string) => void,
  data: InputJSON | null = null,
): FabricObject[] {
  const colors = FIELD_COLORS[field.type]
  const w = field.width
  const h = field.height

  // Resolve the image-field paint shape: either a colour fill (#81) or a
  // baked image asset. Colour wins over filename when both are present
  // (shouldn't happen, but defensive).
  let imageDataUrl: string | null = null
  let imageColor: string | null = null
  if (field.type === 'image' && field.source) {
    const fromValue =
      field.source.mode === 'dynamic'
        ? (field.source.placeholder as unknown)
        : (field.source.value as unknown)
    if (fromValue && typeof fromValue === 'object') {
      if ('color' in fromValue) {
        const c = (fromValue as { color: unknown }).color
        if (typeof c === 'string' && c.length > 0) imageColor = c
      } else if ('filename' in fromValue) {
        const name = (fromValue as { filename: unknown }).filename
        if (typeof name === 'string' && name.length > 0) {
          imageDataUrl = resolveImage(name)
        }
      }
    }
    // GH #81 — dynamic image fields can also receive a colour marker via
    // `data.images[jsonKey]` like `<STATICIMAGE_COLOR_#hex>`; the canvas
    // shows that fill at design time as soon as the user pins it.
    if (!imageColor && field.source.mode === 'dynamic' && data) {
      const supplied = data.images?.[field.source.jsonKey]
      if (typeof supplied === 'string') {
        const m = /^<STATICIMAGE_COLOR_(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))>$/.exec(supplied)
        if (m && m[1]) imageColor = m[1]
      }
    }
  }

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

  // 1. Background rect — always present so the Group has a stable bounding
  //    box and hit-testing works (Fabric needs a non-zero area; fill:
  //    'transparent' still participates in hit-detection unlike fill: null
  //    or fill: '').
  const defaultFill = imageColor ?? (shouldFill ? colors.fill : 'transparent')
  const defaultStroke = colors.stroke
  const defaultStrokeWidth = 1
  const bgRect = new Rect({
    left: 0,
    top: 0,
    width: w,
    height: h,
    fill: defaultFill,
    stroke: defaultStroke,
    strokeWidth: defaultStrokeWidth,
    strokeUniform: true,
    rx: 2,
    ry: 2,
    selectable: false,
    evented: false,
    originX: 'left',
    originY: 'top',
  })
  bgRect.__defaultFill = defaultFill
  bgRect.__defaultStroke = defaultStroke
  bgRect.__defaultStrokeWidth = defaultStrokeWidth

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

/**
 * Load a `FabricImage` from a data URL and configure it to fill the given
 * dimensions per the chosen fit mode. Exported so future async-load paths
 * can call it directly.
 */
export async function loadFabricImage(
  dataUrl: string,
  width: number,
  height: number,
  fieldId: string,
  fit: 'fill' | 'contain' | 'cover' = 'contain',
): Promise<FabricImage> {
  const img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
  const natW = img.width || width
  const natH = img.height || height
  let scaleX: number
  let scaleY: number
  if (fit === 'fill') {
    scaleX = width / natW
    scaleY = height / natH
  } else if (fit === 'cover') {
    const s = Math.max(width / natW, height / natH)
    scaleX = s
    scaleY = s
  } else {
    const s = Math.min(width / natW, height / natH)
    scaleX = s
    scaleY = s
  }
  img.set({
    left: width / 2,
    top: height / 2,
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center',
    scaleX,
    scaleY,
  })
  img.clipPath = new Rect({
    left: 0,
    top: 0,
    width: width / scaleX,
    height: height / scaleY,
    originX: 'center',
    originY: 'center',
    absolutePositioned: false,
  })
  img.__fieldId = `__img_${fieldId}`
  return img
}
