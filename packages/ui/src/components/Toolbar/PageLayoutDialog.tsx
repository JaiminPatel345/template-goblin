/**
 * PageLayoutDialog — modal entry-point for header / footer / page-number
 * settings (#61). Triggered from the toolbar "Page Layout" button.
 *
 * Mirrors the production pattern used by Google Docs / Microsoft Word
 * (Insert → Header & Footer) — these controls aren't field-specific, so
 * surfacing them in the sidebar competes with the per-field property
 * editor. A dedicated dialog keeps the workspace clean and matches what
 * non-technical users already know from Docs / Word.
 */
import { useUiStore } from '../../store/uiStore.js'
import { PageLayoutPanel } from '../RightPanel/PageLayoutPanel.js'

export function PageLayoutDialog() {
  const show = useUiStore((s) => s.showPageLayoutDialog)
  const setShow = useUiStore((s) => s.setShowPageLayoutDialog)
  if (!show) return null

  return (
    <div className="tg-dialog-overlay" onClick={() => setShow(false)}>
      <div
        className="tg-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 360, maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}
        role="dialog"
        aria-labelledby="page-layout-dialog-title"
        data-testid="page-layout-dialog"
      >
        <h2 className="tg-dialog-title" id="page-layout-dialog-title">
          Page Layout
        </h2>
        <PageLayoutPanel />
        <div className="tg-dialog-actions" style={{ marginTop: 12 }}>
          <button className="tg-btn tg-btn--primary" onClick={() => setShow(false)}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
