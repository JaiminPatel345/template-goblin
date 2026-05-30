/**
 * fabricImage — image-field paint resolution + async Fabric image loading.
 * Extracted from `buildGroupChildren` to keep it under the line cap (Hard
 * Rule #11).
 */
import { Rect, FabricImage } from 'fabric'
import type { FieldDefinition, InputJSON } from '@template-goblin/types'

/** Resolve an image asset for a field (placeholder or static) to a data URL, or null. */
export type ImageResolver = (filename: string) => string | null

export interface ImagePaint {
  /** Resolved image data URL to paint, or null. */
  imageDataUrl: string | null
  /** Solid-colour fill (#81) to paint instead of an image, or null. */
  imageColor: string | null
}

/**
 * Resolve how an image field should paint: either a solid colour (#81) or a
 * baked / placeholder image asset. Colour wins over filename when both are
 * present (defensive — shouldn't happen).
 */
export function resolveImagePaint(
  field: FieldDefinition,
  resolveImage: ImageResolver,
  data: InputJSON | null,
): ImagePaint {
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
  return { imageDataUrl, imageColor }
}

/**
 * Load a `FabricImage` from a data URL and configure it to fill the given
 * dimensions per the chosen fit mode.
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
