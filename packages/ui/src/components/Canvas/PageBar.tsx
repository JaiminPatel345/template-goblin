/**
 * PageBar — page navigation strip at the bottom of the canvas.
 *
 * Renders one tab per page plus an "Add Page" button.
 */
import React, { useState } from 'react'
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
  const reorderPages = useTemplateStore((s) => s.reorderPages)
  const currentPageId = useUiStore((s) => s.currentPageId)
  const setCurrentPage = useUiStore((s) => s.setCurrentPage)
  const clearSelection = useUiStore((s) => s.clearSelection)

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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
      {tabs.map((tab, idx) => {
        const isDragging = draggedIndex === idx
        const isDragOver = dragOverIndex === idx && draggedIndex !== idx

        return (
          <div
            key={tab.key}
            data-testid={`page-tab-wrapper-${idx}`}
            draggable={pages.length > 1}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', String(idx))
              e.dataTransfer.effectAllowed = 'move'
              setDraggedIndex(idx)
            }}
            onDragEnd={() => {
              setDraggedIndex(null)
              setDragOverIndex(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (dragOverIndex !== idx) {
                setDragOverIndex(idx)
              }
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return
              setDragOverIndex(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              const fromIdxStr = e.dataTransfer.getData('text/plain')
              const fromIdx = draggedIndex !== null ? draggedIndex : Number(fromIdxStr)
              if (typeof fromIdx === 'number' && !isNaN(fromIdx) && fromIdx !== idx) {
                reorderPages(fromIdx, idx)
              }
              setDraggedIndex(null)
              setDragOverIndex(null)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: isDragging ? 'grabbing' : pages.length > 1 ? 'grab' : 'default',
              opacity: isDragging ? 0.5 : 1,
              borderLeft: isDragOver ? '3px solid var(--accent-primary, #3b82f6)' : 'none',
              paddingLeft: isDragOver ? '2px' : '0px',
              transition: 'border 0.1s ease, opacity 0.1s ease',
            }}
          >
            <button
              className={`tg-btn ${currentPageId === tab.pageId ? 'tg-btn--active' : ''}`}
              style={{ fontSize: '11px', padding: '4px 12px', cursor: 'inherit' }}
              onClick={() => {
                setCurrentPage(tab.pageId)
                clearSelection()
              }}
            >
              {tab.label}
            </button>
            <button
              className="tg-btn tg-btn--danger"
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                marginLeft: '2px',
                cursor: 'pointer',
              }}
              title="Remove this page"
              data-testid={idx === 0 ? 'remove-page-1' : undefined}
              onClick={(e) => {
                e.stopPropagation()
                onRemovePage(tab.pageId)
              }}
            >
              ✕
            </button>
          </div>
        )
      })}

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
