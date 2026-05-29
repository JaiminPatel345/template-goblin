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
import React, { useRef, useCallback, useEffect } from 'react'
import { getPageSize } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { FieldCreationPopup } from './FieldCreationPopup.js'
import { FloatingSelectionToolbar } from './FloatingSelectionToolbar.js'
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
import { useCurrentBackground } from './useCurrentBackground.js'
import { useEffectivePreviewData } from './useEffectivePreviewData.js'
import { deriveCanvasFields } from './deriveCanvasFields.js'

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
  const previewJsonText = useUiStore((s) => s.previewJsonText)
  const maxModeRepeatCount = useUiStore((s) => s.maxModeRepeatCount)

  // ── Refs ───────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null)

  // ── Custom hooks ───────────────────────────────────────────────────────
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

  // QA BUG-02: `currentPageId` defaults to null. Most code paths already
  // fall back to the implicit page-0, but leaving the UI state null is a
  // footgun — users could click the canvas in a state where the active
  // tab and the stamped pageId disagree. On editor mount, if pages exist
  // and currentPageId is null, snap to the first page so the UI state is
  // consistent from the first paint.
  useEffect(() => {
    if (currentPageId === null && pages.length > 0) {
      const first = pages[0]
      if (first) setCurrentPage(first.id)
    }
  }, [currentPageId, pages, setCurrentPage])

  const headerFieldsForPreview = useTemplateStore((s) => s.header?.fields)
  const footerFieldsForPreview = useTemplateStore((s) => s.footer?.fields)

  // GH #79: the canvas reflects the right-panel JSON. `useEffectivePreviewData`
  // parses `previewJsonText` if pinned, falls back to the auto-gen example,
  // and caches the last-good parse so a mid-edit unparseable string never
  // blanks the canvas. #61: include header/footer band fields so their
  // dynamic jsonKeys seed the same flat data buckets the renderer reads.
  const previewData = useEffectivePreviewData({
    fields,
    repeatCount: maxModeRepeatCount,
    previewJsonText,
    headerFields: headerFieldsForPreview,
    footerFields: footerFieldsForPreview,
  })

  // Resolve the current page's render field list (body + translated header /
  // footer band fields, #37/#61) and its size, via `deriveCanvasFields`
  // (Hard Rule #11). `header` / `footer` are read so a band change re-renders.
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

  // ── Container ref callback (for OnboardingPicker compatibility) ────────
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
  }, [])

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  const page0 = pages.find((p) => p.index === 0)
  const page0HasConcreteBg = page0?.backgroundType === 'color' || page0?.backgroundType === 'image'

  // ── Empty state: no background chosen ──────────────────────────────────
  // Previously only `page0IsColor` was accepted here, so a template with an
  // image `pages[0]` and no legacy `backgroundDataUrl` (the state after
  // closing the legacy tab in a 2-page template — GH #23) was
  // mis-classified as "onboarding" and the picker took over the canvas.
  if (!backgroundDataUrl && !page0HasConcreteBg) {
    return (
      <OnboardingPicker
        isDragOver={pageHandlers.isDragOver}
        onDrop={pageHandlers.handleDrop}
        onDragOver={pageHandlers.handleDragOver}
        onDragLeave={pageHandlers.handleDragLeave}
        onChooseImage={() => pageHandlers.fileInputRef.current?.click()}
        onChooseColor={(hex, size) => {
          // Reset currentPageId to null so stale persisted ids don't prevent
          // useCurrentBackground from resolving the newly created page 0.
          setCurrentPage(null)
          setPage0BackgroundColor(hex, size)
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
          // GH #66: native scrollbars when the page (canvas) exceeds the
          // visible viewport. The Fabric `<canvas>` is sized to
          // `pageWidth * zoom × pageHeight * zoom` (see useFabricSync's
          // zoom-sync effect), so when the user zooms past the fit level
          // the canvas grows past this container and the browser draws
          // both scrollbars.
          //
          // Centring uses `margin: auto` on the inner wrapper rather
          // than `align-items / justify-content: center` on the flex
          // container. With flex centring, when the child overflows the
          // container its leading edge (left + top) gets pinned past
          // negative scroll territory and can't be reached by scrollbars
          // — the canvas would clip on the left and top with no way to
          // pan there. `margin: auto` resolves to 0 when there's no room
          // to distribute, so the canvas pins to top-left and overflow
          // flows scrollably towards the bottom-right on both axes.
          overflow: 'auto',
          display: 'flex',
          // #164 — when a placing tool is active, swap the cursor to
          // crosshair across the whole canvas area so the user gets a
          // tool-aware visual cue even outside the page bounds. Without
          // this they'd only see the default arrow until the moment
          // they cross the page rectangle.
          cursor: isPlacing ? 'crosshair' : undefined,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isPlacing && (
          // QA BUG-05: Text / Image / Table tools require a drag to place,
          // but a single click silently resets to select with no
          // feedback. A floating hint banner at the top of the canvas
          // tells non-technical users what to do.
          <div
            data-testid="canvas-place-hint"
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: 'var(--text-on-accent)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 'var(--z-sticky)' as unknown as number,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Click and drag on the page to place
            {activeTool === 'addText' ? ' a text field' : ''}
            {activeTool === 'addImage' ? ' an image' : ''}
            {activeTool === 'addLoop' ? ' a table' : ''}
          </div>
        )}
        <div data-testid="canvas-stage-wrapper" style={{ flex: 'none', margin: 'auto' }}>
          <canvas key="fabric-canvas" ref={setCanvasEl} />
        </div>
      </div>

      {/* #167 — floating B/I/U/S + colour toolbar anchored to the selected
          text field. Rendered as a fixed-position sibling so it overlays the
          scrollable canvas without being clipped by its overflow. */}
      <FloatingSelectionToolbar fabric={fabricInstance} />

      <PageBar
        onRemovePage={pageHandlers.handleRemovePage}
        onShowAddDialog={() => pageHandlers.setShowAddPageDialog(true)}
      />

      {pageHandlers.showAddPageDialog && (
        <AddPageDialog
          onClose={() => pageHandlers.setShowAddPageDialog(false)}
          onAdd={pageHandlers.handleAddPage}
          previousSize={(() => {
            // The "previous" page is whichever sheet the user is currently
            // looking at. Falls back to the highest-indexed page, then to
            // template meta if no explicit pages exist (legacy onboarding).
            const cur = pages.find((p) => p.id === currentPageId)
            const last = [...pages].sort((a, b) => b.index - a.index)[0]
            return getPageSize(cur ?? last ?? null, meta)
          })()}
        />
      )}

      {pageHandlers.showChangeBgDialog && (
        <AddPageDialog
          mode="edit"
          onClose={() => pageHandlers.setShowChangeBgDialog(false)}
          onAdd={pageHandlers.handleChangeBackground}
          previousSize={(() => {
            // In edit mode the "previous size" pre-fill is the size of the
            // page being edited — same logic as add mode.
            const cur = pages.find((p) => p.id === currentPageId)
            const last = [...pages].sort((a, b) => b.index - a.index)[0]
            return getPageSize(cur ?? last ?? null, meta)
          })()}
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
