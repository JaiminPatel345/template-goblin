/**
 * useCanvasModel — all of CanvasArea's store reads, derived data, Fabric
 * lifecycle, and reconciliation, extracted so the component is render-only
 * (Hard Rule #11). Returns just what the render needs.
 */
import { useCallback, useEffect, useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { useFabricCanvas } from './useFabricCanvas.js'
import {
  useFabricSync,
  useBackgroundImage,
  usePlaceholderImages,
  useImageResolver,
} from './useFabricSync.js'
import { useCanvasKeyboard } from './useCanvasKeyboard.js'
import { usePageHandlers } from './usePageHandlers.js'
import { useCurrentBackground } from './useCurrentBackground.js'
import { useEffectivePreviewData } from './useEffectivePreviewData.js'
import { deriveCanvasFields } from './deriveCanvasFields.js'

export function useCanvasModel() {
  // ── Store ──────────────────────────────────────────────────────────────
  const meta = useTemplateStore((s) => s.meta)
  const fields = useTemplateStore((s) => s.fields)
  const pages = useTemplateStore((s) => s.pages)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)
  const placeholderBuffers = useTemplateStore((s) => s.placeholderBuffers)
  const staticImageBuffers = useTemplateStore((s) => s.staticImageBuffers)
  const staticImageDataUrls = useTemplateStore((s) => s.staticImageDataUrls)
  const setPage0BackgroundColor = useTemplateStore((s) => s.setPage0BackgroundColor)

  const activeTool = useUiStore((s) => s.activeTool)
  const selectedFieldIds = useUiStore((s) => s.selectedFieldIds)
  const showGrid = useUiStore((s) => s.showGrid)
  const gridSize = useUiStore((s) => s.gridSize)
  const zoom = useUiStore((s) => s.zoom)
  const currentPageId = useUiStore((s) => s.currentPageId)
  const setCurrentPage = useUiStore((s) => s.setCurrentPage)
  const previewJsonText = useUiStore((s) => s.previewJsonText)
  const maxModeRepeatCount = useUiStore((s) => s.maxModeRepeatCount)

  // ── Refs + hooks ─────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pageHandlers = usePageHandlers()
  const { fabricRef, fabricInstance, setCanvasEl, spacePanModeRef } = useFabricCanvas(
    containerRef,
    pageHandlers.setPendingDraft,
  )
  useCanvasKeyboard(fabricRef, spacePanModeRef)

  // ── Derived data ───────────────────────────────────────────────────────
  const { currentBgDataUrl, currentBgColor } = useCurrentBackground()
  const bgImage = useBackgroundImage(currentBgDataUrl)
  const placeholderImages = usePlaceholderImages(fields, placeholderBuffers, staticImageBuffers)
  const resolveImage = useImageResolver(placeholderImages, staticImageDataUrls)

  const isPlacing =
    activeTool === 'addText' || activeTool === 'addImage' || activeTool === 'addLoop'

  // QA BUG-02: snap a null currentPageId to the first page on mount so the UI
  // state can't disagree with the stamped pageId.
  useEffect(() => {
    if (currentPageId === null && pages.length > 0) {
      const first = pages[0]
      if (first) setCurrentPage(first.id)
    }
  }, [currentPageId, pages, setCurrentPage])

  const headerFieldsForPreview = useTemplateStore((s) => s.header?.fields)
  const footerFieldsForPreview = useTemplateStore((s) => s.footer?.fields)

  // GH #79: the canvas reflects the right-panel JSON (cached last-good parse).
  const previewData = useEffectivePreviewData({
    fields,
    repeatCount: maxModeRepeatCount,
    previewJsonText,
    headerFields: headerFieldsForPreview,
    footerFields: footerFieldsForPreview,
  })

  // Current page's render field list + size (#37/#61). `header`/`footer` read
  // so a band change re-renders.
  const header = useTemplateStore((s) => s.header)
  const footer = useTemplateStore((s) => s.footer)
  const { pageFields, pageBounds } = deriveCanvasFields({
    meta,
    fields,
    pages,
    currentPageId,
    header,
    footer,
  })

  // ── Sync effects ───────────────────────────────────────────────────────
  useFabricSync({
    fabricRef,
    fabricInstance,
    pageFields,
    bgImage,
    currentBgColor,
    resolveImage,
    meta: pageBounds,
    currentPageId,
    selectedFieldIds,
    showGrid,
    gridSize,
    zoom,
    isPlacing,
    data: previewData,
  })

  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
  }, [])

  const page0 = pages.find((p) => p.index === 0)
  const page0HasConcreteBg = page0?.backgroundType === 'color' || page0?.backgroundType === 'image'

  return {
    meta,
    pages,
    currentPageId,
    activeTool,
    isPlacing,
    backgroundDataUrl,
    page0HasConcreteBg,
    setPage0BackgroundColor,
    setCurrentPage,
    pageHandlers,
    fabricInstance,
    setCanvasEl,
    setContainerRef,
  }
}
