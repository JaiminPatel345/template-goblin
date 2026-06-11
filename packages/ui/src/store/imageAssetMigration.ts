import type { FieldDefinition } from '@template-goblin/types'
import { bufferToDataUrl } from '../utils/previewInputs.js'

/**
 * Image-byte migration for `setFieldMode` flips.
 *
 * An image field's bytes live in one of two store pools keyed by filename:
 *   - `placeholderBuffers` — dynamic fields' canvas-preview bitmaps
 *     (saved under `placeholders/` in the .tgbl),
 *   - `staticImageBuffers` (+ `staticImageDataUrls` mirror) — static
 *     fields' baked-in assets (saved under `images/`).
 *
 * The PDF renderer resolves STRICTLY by pool: a static field whose
 * filename only exists in the placeholder pool fails preflight with
 * MISSING_ASSET ("archive does not contain that file"). Flipping a field
 * dynamic ↔ static carries the filename across (`setFieldMode` moves
 * `placeholder` → `value` and back) — so the bytes must follow it. This
 * helper copies them into the destination pool (the source copy is kept:
 * other fields may reference the same filename, and a later flip back
 * becomes a no-op).
 */
export interface ImageAssetPools {
  placeholderBuffers: Map<string, ArrayBuffer>
  staticImageBuffers: Map<string, ArrayBuffer>
  staticImageDataUrls: Map<string, string>
}

/**
 * Compute the pool updates needed when `field` (pre-flip) switches to
 * `mode`. Returns `null` when nothing needs to move (non-image field,
 * solid-colour value, no filename, bytes already in place, or bytes
 * missing entirely).
 */
export function migrateImageAssetOnModeFlip(
  field: FieldDefinition,
  mode: 'static' | 'dynamic',
  pools: ImageAssetPools,
): Partial<ImageAssetPools> | null {
  if (field.type !== 'image' || !field.source) return null

  if (mode === 'static' && field.source.mode === 'dynamic') {
    const filename = filenameOf(field.source.placeholder)
    if (!filename || pools.staticImageBuffers.has(filename)) return null
    const buffer = pools.placeholderBuffers.get(filename)
    if (!buffer) return null
    const staticImageBuffers = new Map(pools.staticImageBuffers)
    const staticImageDataUrls = new Map(pools.staticImageDataUrls)
    staticImageBuffers.set(filename, buffer)
    staticImageDataUrls.set(filename, bufferToDataUrl(buffer))
    return { staticImageBuffers, staticImageDataUrls }
  }

  if (mode === 'dynamic' && field.source.mode === 'static') {
    const filename = filenameOf(field.source.value)
    if (!filename || pools.placeholderBuffers.has(filename)) return null
    const buffer = pools.staticImageBuffers.get(filename)
    if (!buffer) return null
    const placeholderBuffers = new Map(pools.placeholderBuffers)
    placeholderBuffers.set(filename, buffer)
    return { placeholderBuffers }
  }

  return null
}

function filenameOf(value: unknown): string | null {
  if (value && typeof value === 'object' && 'filename' in value) {
    const filename = (value as { filename: unknown }).filename
    if (typeof filename === 'string' && filename.length > 0) return filename
  }
  return null
}
