/**
 * CanvasArea — render-only orchestrator for the Fabric.js canvas.
 *
 * All store reads, derived data, Fabric lifecycle, and store↔canvas
 * reconciliation live in `useCanvasModel` (Hard Rule #11). This component
 * just composes the onboarding empty-state, the canvas surface, the floating
 * selection toolbar, the page bar, and the add-page / field-creation dialogs.
 */
import { getPageSize } from '@template-goblin/types'
import { FieldCreationPopup } from './FieldCreationPopup.js'
import { FloatingSelectionToolbar } from './FloatingSelectionToolbar.js'
import { AddPageDialog } from './AddPageDialog.js'
import { PageBar } from './PageBar.js'
import { useCanvasModel } from './useCanvasModel.js'

export function CanvasArea() {
  const {
    meta,
    pages,
    currentPageId,
    activeTool,
    isPlacing,
    pageHandlers,
    fabricInstance,
    setCanvasEl,
    setContainerRef,
  } = useCanvasModel()

  // The "previous" page size pre-fill for the add / edit dialogs: whichever
  // sheet the user is looking at, falling back to the highest-indexed page,
  // then template meta.
  const previousPageSize = () => {
    const cur = pages.find((p) => p.id === currentPageId)
    const last = [...pages].sort((a, b) => b.index - a.index)[0]
    return getPageSize(cur ?? last ?? null, meta)
  }

  const curPage = pages.find((p) => p.id === currentPageId) ?? pages[0]
  const currentPageIndex = curPage ? curPage.index : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div
        ref={setContainerRef}
        style={{
          flex: 1,
          position: 'relative',
          background: 'var(--canvas-bg)',
          minHeight: 0,
          // GH #66: native scrollbars when the page exceeds the viewport. The
          // Fabric `<canvas>` is sized to `pageW*zoom × pageH*zoom`, so zooming
          // past the fit level grows it past this container and both
          // scrollbars appear. Centring uses `margin: auto` on the inner
          // wrapper (not flex centring) so an overflowing canvas pins to
          // top-left and stays fully reachable by the scrollbars.
          overflow: 'auto',
          display: 'flex',
          // #164 — crosshair cursor across the whole area while a placing tool
          // is active, so the cue shows even outside the page bounds.
          cursor: isPlacing ? 'crosshair' : undefined,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isPlacing && (
          // QA BUG-05: placing tools require a drag; a single click silently
          // resets to select. This hint banner tells users what to do.
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
          text field. Fixed-position sibling so it overlays the scrollable
          canvas without being clipped by its overflow. */}
      <FloatingSelectionToolbar fabric={fabricInstance} />

      <PageBar
        onRemovePage={pageHandlers.handleRemovePage}
        onShowAddDialog={() => pageHandlers.setShowAddPageDialog(true)}
      />

      {pageHandlers.showAddPageDialog && (
        <AddPageDialog
          onClose={() => pageHandlers.setShowAddPageDialog(false)}
          onAdd={pageHandlers.handleAddPage}
          previousSize={previousPageSize()}
          pageIndex={currentPageIndex}
        />
      )}

      {pageHandlers.showChangeBgDialog && (
        <AddPageDialog
          mode="edit"
          onClose={() => pageHandlers.setShowChangeBgDialog(false)}
          onAdd={pageHandlers.handleChangeBackground}
          previousSize={previousPageSize()}
          pageIndex={currentPageIndex}
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
