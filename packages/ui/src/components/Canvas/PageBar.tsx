/**
 * PageBar — page navigation strip at the bottom of the canvas.
 *
 * Renders one tab per page plus an "Add Page" button.
 */
import React from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'

export function PageBar({
  onRemovePage,
  onShowAddDialog,
}: {
  onRemovePage: (pageId: string | null) => void
  onShowAddDialog: () => void
}) {
  const pages = useTemplateStore((s) => s.pages)
  const currentPageId = useUiStore((s) => s.currentPageId)
  const setCurrentPage = useUiStore((s) => s.setCurrentPage)
  const clearSelection = useUiStore((s) => s.clearSelection)

  const sorted = [...pages].sort((a, b) => a.index - b.index)
  const explicitFirst = sorted[0]?.index === 0 ? sorted[0] : undefined

  const firstTab = explicitFirst
    ? { id: explicitFirst.id, label: 'Page 1', pageId: explicitFirst.id as string | null }
    : { id: '__implicit_page_0__', label: 'Page 1', pageId: null as string | null }

  const remaining = explicitFirst ? sorted.slice(1) : sorted
  const tabs = [
    { key: firstTab.id, label: firstTab.label, pageId: firstTab.pageId },
    ...remaining.map((p, i) => ({
      key: p.id,
      label: `Page ${i + 2}`,
      pageId: p.id as string | null,
    })),
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '6px 12px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab, idx) => (
        <div key={tab.key} style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className={`tg-btn ${currentPageId === tab.pageId ? 'tg-btn--active' : ''}`}
            style={{ fontSize: '11px', padding: '4px 12px' }}
            onClick={() => {
              setCurrentPage(tab.pageId)
              clearSelection()
            }}
          >
            {tab.label}
          </button>
          <button
            className="tg-btn tg-btn--danger"
            style={{ fontSize: '10px', padding: '2px 6px', marginLeft: '2px' }}
            title="Remove this page"
            data-testid={idx === 0 ? 'remove-page-1' : undefined}
            onClick={() => onRemovePage(tab.pageId)}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        className="tg-btn"
        style={{ fontSize: '11px', padding: '4px 10px', marginLeft: '4px' }}
        onClick={onShowAddDialog}
        title="Add new page"
      >
        + Add Page
      </button>
    </div>
  )
}
