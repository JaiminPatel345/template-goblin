/**
 * Dispatcher that wires the pure auto-shrink helpers in `autoShrink.ts` to
 * the template store (#42). Trigger sites (popup confirm, right-panel blur,
 * right-panel image change) call `autoShrinkStaticField(fieldId)` and the
 * dispatcher handles per-type measurement + `updateField` dispatch.
 *
 * Returns a Promise because the image path waits for the natural-size load.
 * Callers can `void`-ignore it (popup, image picker) — the shrink is a UX
 * nicety, not a correctness step.
 */
import { useTemplateStore } from '../store/templateStore.js'
import { fitStaticImageRect, measureStaticTextRect } from './autoShrink.js'
import type { TextField, ImageField } from '@template-goblin/types'

/**
 * Measure the field's static content and dispatch a shrink via `updateField`
 * if the result is smaller than the current rect on either axis.
 *
 * No-ops on dynamic fields, table fields (out of scope per issue), missing
 * field ids, and empty / unloaded content.
 */
export async function autoShrinkStaticField(fieldId: string): Promise<void> {
  const store = useTemplateStore.getState()
  const field = store.fields.find((f) => f.id === fieldId)
  if (!field || field.source?.mode !== 'static') return

  if (field.type === 'text') {
    shrinkTextField(field as TextField)
    return
  }
  if (field.type === 'image') {
    try {
      await shrinkImageField(field as ImageField)
    } catch {
      // Image decode failed or the buffer was unreadable — leave the rect.
    }
  }
}

function shrinkTextField(field: TextField): void {
  if (field.source.mode !== 'static') return
  const value = field.source.value
  if (!value) return
  const next = measureStaticTextRect(
    value,
    field.style.fontFamily,
    field.style.fontSize,
    field.style.lineHeight,
    field.width,
    field.height,
    { fontWeight: field.style.fontWeight, fontStyle: field.style.fontStyle },
  )
  applyShrinkIfChanged(field.id, field.width, field.height, next)
}

async function shrinkImageField(field: ImageField): Promise<void> {
  if (field.source.mode !== 'static') return
  const value = field.source.value
  // Solid-colour static fields have no natural dims — skip.
  if (!('filename' in value) || !value.filename) return

  // Two existing pipelines feed an image rect: the create-popup goes through
  // `addStaticImage` (writes `staticImageDataUrls`), while the right-panel
  // upload goes through `addPlaceholder` (writes only `placeholderBuffers`).
  // We resolve from whichever is populated so both trigger sites work.
  const src = resolveImageSrc(value.filename)
  if (!src) return

  let img: HTMLImageElement
  try {
    img = await loadImage(src.url)
  } finally {
    if (src.revoke) URL.revokeObjectURL(src.url)
  }
  if (!img.naturalWidth || !img.naturalHeight) return
  const next = fitStaticImageRect(field.width, field.height, img.naturalWidth, img.naturalHeight)
  applyShrinkIfChanged(field.id, field.width, field.height, next)
}

interface ImageSrc {
  url: string
  /** Whether to call `URL.revokeObjectURL` after the load resolves. */
  revoke: boolean
}

function resolveImageSrc(filename: string): ImageSrc | null {
  const state = useTemplateStore.getState()
  const dataUrl = state.staticImageDataUrls?.get(filename)
  if (dataUrl) return { url: dataUrl, revoke: false }
  const buffer = state.staticImageBuffers?.get(filename) ?? state.placeholderBuffers?.get(filename)
  if (!buffer) return null
  const blob = new Blob([buffer])
  return { url: URL.createObjectURL(blob), revoke: true }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = src
  })
}

function applyShrinkIfChanged(
  id: string,
  currentW: number,
  currentH: number,
  next: { width: number; height: number },
): void {
  // Round to avoid jitter from sub-pixel measurement drift and only dispatch
  // when the change is meaningful (≥ 1 pt on at least one axis).
  const w = Math.round(next.width)
  const h = Math.round(next.height)
  if (Math.abs(w - currentW) < 1 && Math.abs(h - currentH) < 1) return
  // Hard constraint: never grow. Belt-and-suspenders on the helper guarantee.
  const finalW = Math.min(currentW, w)
  const finalH = Math.min(currentH, h)
  useTemplateStore.getState().updateField(id, { width: finalW, height: finalH })
}
