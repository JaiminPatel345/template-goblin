/**
 * useFabricImages — image-loading hooks consumed by `useFabricSync`.
 *
 * These hooks turn raw ArrayBuffers (placeholder bitmaps, static images)
 * into `HTMLImageElement`s the Fabric canvas can render, plus a unified
 * `ImageResolver` callback for `applyFieldToGroup` to resolve
 * `filename → src` lookups.
 *
 * Extracted from `useFabricSync.ts` to keep that file under the 300-line cap
 * (see CLAUDE.md Hard Rule #11).
 */
import { useEffect, useCallback, useState } from 'react'
import type { FieldDefinition } from '@template-goblin/types'
import type { ImageResolver } from './fabricUtils.js'

/** Loads the current page's background as an HTMLImageElement. */
export function useBackgroundImage(currentBgDataUrl: string | null) {
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!currentBgDataUrl) {
      setBgImage(null)
      return
    }
    const img = new window.Image()
    img.src = currentBgDataUrl
    img.onload = () => setBgImage(img)
  }, [currentBgDataUrl])

  return bgImage
}

/** Builds a Map<filename, HTMLImageElement> from placeholder/static buffers. */
export function usePlaceholderImages(
  fields: FieldDefinition[],
  placeholderBuffers: Map<string, ArrayBuffer>,
  staticImageBuffers: Map<string, ArrayBuffer>,
): Map<string, HTMLImageElement> {
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map())

  useEffect(() => {
    const filenames = new Set<string>()
    for (const f of fields) {
      if (f.type !== 'image' || !f.source) continue
      if (f.source.mode === 'dynamic') {
        const ph = f.source.placeholder as unknown
        if (ph && typeof ph === 'object' && 'filename' in ph) {
          const name = (ph as { filename: unknown }).filename
          if (typeof name === 'string' && name.length > 0) filenames.add(name)
        }
      } else if (f.source.mode === 'static') {
        const v = f.source.value as unknown
        if (v && typeof v === 'object' && 'filename' in v) {
          const name = (v as { filename: unknown }).filename
          if (typeof name === 'string' && name.length > 0) filenames.add(name)
        }
      }
    }

    const next = new Map<string, HTMLImageElement>()
    let pending = 0
    let resolved = 0
    filenames.forEach((filename) => {
      const buf = placeholderBuffers.get(filename) ?? staticImageBuffers.get(filename)
      if (!buf) return
      pending++
      const blob = new Blob([buf])
      const url = URL.createObjectURL(blob)
      const img = new window.Image()
      img.onload = () => {
        next.set(filename, img)
        resolved++
        if (resolved === pending) setImages(new Map(next))
      }
      img.onerror = () => {
        resolved++
        if (resolved === pending) setImages(new Map(next))
      }
      img.src = url
    })

    if (pending === 0) setImages(new Map())
  }, [fields, placeholderBuffers, staticImageBuffers])

  return images
}

/** Creates an ImageResolver function from loaded images + static data URLs. */
export function useImageResolver(
  placeholderImages: Map<string, HTMLImageElement>,
  staticImageDataUrls: Map<string, string>,
): ImageResolver {
  return useCallback(
    (filename: string): string | null => {
      const img = placeholderImages.get(filename)
      if (img) return img.src
      const url = staticImageDataUrls.get(filename)
      if (url) return url
      return null
    },
    [placeholderImages, staticImageDataUrls],
  )
}
