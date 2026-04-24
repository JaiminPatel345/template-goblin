/**
 * useFabricSync — reconciliation effects that keep the Fabric canvas in sync
 * with the store (fields, selection, background, grid, zoom, resize).
 *
 * Each concern is a separate useEffect so React can skip unchanged deps.
 */
import { useEffect, useCallback, useState } from 'react'
import {
  type Canvas as FabricCanvas,
  FabricImage,
  ActiveSelection,
  type Group as FabricGroup,
} from 'fabric'
import type { FabricObject } from 'fabric'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import type { FieldDefinition } from '@template-goblin/types'
import {
  createFieldGroup,
  applyFieldToGroup,
  buildGridLines,
  centreViewport,
  fitZoomLevel,
  type ImageResolver,
} from './fabricUtils.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncDeps {
  fabricRef: React.RefObject<FabricCanvas | null>
  /**
   * State mirror of `fabricRef.current`. Effects that react to canvas
   * creation/disposal MUST depend on this — refs have stable identity and
   * don't trigger dep re-fires (GH #17).
   */
  fabricInstance: FabricCanvas | null
  containerRef: React.RefObject<HTMLDivElement | null>
  /**
   * State mirror of `containerRef.current`. Effects that must re-attach to
   * a new container element (e.g. the ResizeObserver) depend on this so the
   * observer doesn't stay bound to the unmounted onboarding picker on the
   * first visit (GH #17).
   */
  containerEl: HTMLDivElement | null
  pageFields: FieldDefinition[]
  bgImage: HTMLImageElement | null
  currentBgColor: string | null
  resolveImage: ImageResolver
  meta: { width: number; height: number }
  selectedFieldIds: string[]
  showGrid: boolean
  gridSize: number
  zoom: number
  isPlacing: boolean
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFabricSync(deps: SyncDeps) {
  const {
    fabricRef,
    fabricInstance,
    containerRef,
    containerEl,
    pageFields,
    bgImage,
    currentBgColor,
    resolveImage,
    meta,
    selectedFieldIds,
    showGrid,
    gridSize,
    zoom,
    isPlacing,
  } = deps

  // ═══════════════ Reconciliation: store → canvas (REQ-050) ═══════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    const existing = new Map<string, FabricGroup>()
    fc.getObjects().forEach((o) => {
      if (o.__fieldId && !o.__isGrid) {
        existing.set(o.__fieldId, o as FabricGroup)
      }
    })

    const sorted = [...pageFields].sort((a, b) => a.zIndex - b.zIndex)

    // Add / patch
    sorted.forEach((field) => {
      const g = existing.get(field.id)
      if (g) {
        applyFieldToGroup(g, field, resolveImage)
        existing.delete(field.id)
      } else {
        const newGroup = createFieldGroup(field, resolveImage)
        fc.add(newGroup)
      }
    })

    // Remove stale groups
    existing.forEach((g) => fc.remove(g))

    // Enforce z-index ordering (REQ-049)
    const gridCount = fc.getObjects().filter((o) => o.__isGrid).length
    sorted.forEach((field, idx) => {
      const g = fc.getObjects().find((o) => o.__fieldId === field.id)
      if (g) fc.moveObjectTo(g, gridCount + idx)
    })

    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, pageFields, resolveImage])

  // ═══════════════ Selection sync: store → canvas ═════════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    const activeIds = fc
      .getActiveObjects()
      .map((o) => o.__fieldId)
      .filter((id): id is string => !!id)

    const sortedActive = [...activeIds].sort()
    const sortedStore = [...selectedFieldIds].sort()
    if (
      sortedActive.length === sortedStore.length &&
      sortedActive.every((id, i) => id === sortedStore[i])
    ) {
      return
    }

    if (selectedFieldIds.length === 0) {
      fc.discardActiveObject()
    } else if (selectedFieldIds.length === 1) {
      const g = fc.getObjects().find((o) => o.__fieldId === selectedFieldIds[0])
      if (g) fc.setActiveObject(g)
    } else {
      const sel = selectedFieldIds
        .map((id) => fc.getObjects().find((o) => o.__fieldId === id))
        .filter(Boolean) as FabricObject[]
      if (sel.length > 0) {
        fc.setActiveObject(new ActiveSelection(sel, { canvas: fc }))
      }
    }
    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, selectedFieldIds])

  // ═══════════════ Background sync (REQ-034, AC-001) ═════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    if (bgImage) {
      const fabricImg = new FabricImage(bgImage, { originX: 'left', originY: 'top' })
      const imgW = fabricImg.width || meta.width
      const imgH = fabricImg.height || meta.height
      fabricImg.set({
        scaleX: meta.width / imgW,
        scaleY: meta.height / imgH,
      })
      fc.backgroundImage = fabricImg
      fc.backgroundColor = ''
    } else if (currentBgColor) {
      // Solid-colour background: use Fabric's native canvas.backgroundColor so
      // that the page colour is always visible regardless of zoom/pan.  The
      // previous implementation set backgroundImage to a Rect which is a type
      // mismatch (Fabric v6 types backgroundImage as FabricImage) and can cause
      // the Rect to silently fail to render when it has no canvas reference.
      fc.backgroundImage = undefined
      fc.backgroundColor = currentBgColor
    } else {
      fc.backgroundImage = undefined
      fc.backgroundColor = ''
    }
    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, bgImage, currentBgColor, meta.width, meta.height])

  // ═══════════════ Grid sync (REQ-009, AC-008) ═══════════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    const oldGrid = fc.getObjects().filter((o) => o.__isGrid)
    if (oldGrid.length > 0) fc.remove(...oldGrid)

    if (showGrid && meta.width > 0 && meta.height > 0) {
      const lines = buildGridLines(meta.width, meta.height, gridSize)
      fc.add(...lines)
      lines.forEach((l) => fc.sendObjectToBack(l))
    }
    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, showGrid, gridSize, meta.width, meta.height])

  // ═══════════════ Zoom sync: store → canvas (REQ-037..042) ══════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    if (Math.abs(fc.getZoom() - zoom) < 0.001) return

    const canW = fc.width ?? 0
    const canH = fc.height ?? 0
    const vpt = centreViewport(zoom, meta.width, meta.height, canW, canH)
    fc.setViewportTransform(vpt)
    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, zoom, meta.width, meta.height])

  // ═══════════════ Auto-fit Zoom on Meta Change ══════════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || meta.width <= 0 || meta.height <= 0) return
    // Wait for container to have dimensions
    const canW = containerRef.current?.clientWidth ?? fc.width ?? 800
    const canH = containerRef.current?.clientHeight ?? fc.height ?? 600
    const z = fitZoomLevel(meta.width, meta.height, canW, canH, 40)
    useUiStore.getState().setZoom(z)
  }, [fabricRef, fabricInstance, containerRef, containerEl, meta.width, meta.height])

  // ═══════════════ Resize observer ═══════════════════════════════════════
  // Depend on `containerEl` (state mirror) and `fabricInstance` rather than
  // the ref objects — refs have stable identity so the old implementation
  // stayed bound to the onboarding picker's <div> after the canvas subtree
  // mounted on the first visit (GH #17).
  useEffect(() => {
    if (!containerEl || !fabricInstance) return

    const observer = new ResizeObserver(() => {
      const fc = fabricRef.current
      if (!fc) return
      const w = containerEl.clientWidth
      const h = containerEl.clientHeight
      fc.setDimensions({ width: w, height: h })

      const z = fc.getZoom()
      const { width: pw, height: ph } = useTemplateStore.getState().meta
      if (pw > 0 && ph > 0) {
        const vpt = centreViewport(z, pw, ph, w, h)
        fc.setViewportTransform(vpt)
        fc.requestRenderAll()
      }
    })
    observer.observe(containerEl)
    return () => observer.disconnect()
  }, [fabricRef, fabricInstance, containerEl])

  // ═══════════════ Cursor sync (REQ-043) ═════════════════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    if (isPlacing) {
      fc.defaultCursor = 'crosshair'
      fc.hoverCursor = 'crosshair'
    } else {
      fc.defaultCursor = 'default'
      fc.hoverCursor = 'move'
    }
  }, [fabricRef, fabricInstance, isPlacing])
}

// ─── Standalone hooks for background & placeholder image loading ─────────────

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
