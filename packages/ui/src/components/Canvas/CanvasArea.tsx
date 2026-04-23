/**
 * CanvasArea — slim orchestrator that composes the Fabric.js canvas hooks.
 *
 * All heavy logic lives in dedicated modules:
 *   - useFabricCanvas  → canvas lifecycle + event wiring
 *   - useFabricSync    → store↔canvas reconciliation effects
 *   - useCanvasKeyboard → keyboard shortcuts
 *   - usePageHandlers  → page CRUD, file uploads, creation popup
 *   - OnboardingPicker → empty-state onboarding
 *   - AddPageDialog    → add-page dialog
 */
import React, { useRef, useCallback } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { FieldCreationPopup } from './FieldCreationPopup.js'
import { OnboardingPicker } from './OnboardingPicker.js'
import { AddPageDialog } from './AddPageDialog.js'
import { PageBar } from './PageBar.js'
import { useFabricCanvas } from './useFabricCanvas.js'
import {
  useFabricSync,
  useBackgroundImage,
  usePlaceholderImages,
  useImageResolver,
} from './useFabricSync.js'
import { useCanvasKeyboard } from './useCanvasKeyboard.js'
import { usePageHandlers } from './usePageHandlers.js'

// ─── Background resolution helpers ──────────────────────────────────────────

function useCurrentBackground() {
  const pages = useTemplateStore((s) => s.pages)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)
  const pageBackgroundDataUrls = useTemplateStore((s) => s.pageBackgroundDataUrls)
  const currentPageId = useUiStore((s) => s.currentPageId)

  // Guard: if the persisted currentPageId no longer exists in the current
  // template (e.g. stale localStorage from a previous session), treat it as
  // null so that page-0 / backgroundDataUrl fallbacks apply correctly.
  const effectivePageId =
    currentPageId !== null && pages.some((p) => p.id === currentPageId) ? currentPageId : null

  const currentBgDataUrl = ((): string | null => {
    if (pages.length === 0) return backgroundDataUrl
    if (effectivePageId === null) return backgroundDataUrl

    const page = pages.find((p) => p.id === effectivePageId)
    if (!page) return backgroundDataUrl

    if (page.backgroundType === 'image') {
      return pageBackgroundDataUrls.get(page.id) ?? null
    }
    if (page.backgroundType === 'inherit') {
      for (let i = page.index - 1; i >= 0; i--) {
        const prev = pages.find((p) => p.index === i)
        if (!prev) continue
        if (prev.backgroundType === 'image') {
          return pageBackgroundDataUrls.get(prev.id) ?? null
        }
        if (prev.backgroundType === 'color') return null
      }
      return backgroundDataUrl
    }
    return null
  })()

  const currentBgColor = ((): string | null => {
    if (pages.length === 0) return null
    if (effectivePageId === null) {
      const page0 = pages.find((p) => p.index === 0)
      if (page0 && page0.backgroundType === 'color') return page0.backgroundColor
      return null
    }
    const page = pages.find((p) => p.id === effectivePageId)
    if (!page) return null
    if (page.backgroundType === 'color') return page.backgroundColor
    return null
  })()

  return { currentBgDataUrl, currentBgColor }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CanvasArea() {
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

  // ── Refs ───────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null)

  // ── Custom hooks ───────────────────────────────────────────────────────
  const pageHandlers = usePageHandlers()

  const { fabricRef, setCanvasEl, spacePanModeRef } = useFabricCanvas(
    containerRef,
    pageHandlers.setPendingDraft,
  )

  useCanvasKeyboard(fabricRef, spacePanModeRef)

  // ── Derived data ───────────────────────────────────────────────────────
  const { currentBgDataUrl, currentBgColor } = useCurrentBackground()
  const bgImage = useBackgroundImage(currentBgDataUrl)
  const placeholderImages = usePlaceholderImages(fields, placeholderBuffers, staticImageBuffers)
  const resolveImage = useImageResolver(placeholderImages, staticImageDataUrls)

  const pageFields = fields.filter((f) => {
    if (currentPageId === null) return f.pageId === null || f.pageId === undefined
    return f.pageId === currentPageId
  })

  const isPlacing =
    activeTool === 'addText' || activeTool === 'addImage' || activeTool === 'addLoop'

  // ── Sync effects ───────────────────────────────────────────────────────
  useFabricSync({
    fabricRef,
    containerRef,
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
  })

  // ── Container ref callback (for OnboardingPicker compatibility) ────────
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
  }, [])

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  const page0 = pages.find((p) => p.index === 0)
  const page0IsColor = page0?.backgroundType === 'color'

  // ── Empty state: no background chosen ──────────────────────────────────
  if (!backgroundDataUrl && !page0IsColor) {
    return (
      <OnboardingPicker
        isDragOver={pageHandlers.isDragOver}
        onDrop={pageHandlers.handleDrop}
        onDragOver={pageHandlers.handleDragOver}
        onDragLeave={pageHandlers.handleDragLeave}
        onChooseImage={() => pageHandlers.fileInputRef.current?.click()}
        onChooseColor={(hex) => {
          // Reset currentPageId to null so stale persisted ids don't prevent
          // useCurrentBackground from resolving the newly created page 0.
          setCurrentPage(null)
          setPage0BackgroundColor(hex)
        }}
        fileInputRef={pageHandlers.fileInputRef}
        onFileChange={pageHandlers.handleInputChange}
        setContainerRef={setContainerRef}
      />
    )
  }

  // ── Canvas state: background set ──────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div
        ref={setContainerRef}
        style={{
          flex: 1,
          position: 'relative',
          background: 'var(--canvas-bg)',
          minHeight: 0,
          overflow: 'hidden',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div data-testid="canvas-stage-wrapper" style={{ width: '100%', height: '100%' }}>
          <canvas key="fabric-canvas" ref={setCanvasEl} />
        </div>
      </div>

      <PageBar
        onRemovePage={pageHandlers.handleRemovePage}
        onShowAddDialog={() => pageHandlers.setShowAddPageDialog(true)}
      />

      {pageHandlers.showAddPageDialog && (
        <AddPageDialog
          onClose={() => pageHandlers.setShowAddPageDialog(false)}
          onAdd={pageHandlers.handleAddPage}
        />
      )}

      {pageHandlers.pendingDraft && (
        <FieldCreationPopup
          draft={pageHandlers.pendingDraft}
          onCancel={pageHandlers.handlePopupCancel}
          onConfirm={pageHandlers.handlePopupConfirm}
        />
      )}
    </div>
  )
}
