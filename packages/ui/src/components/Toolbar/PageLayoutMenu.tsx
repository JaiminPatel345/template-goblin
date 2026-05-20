/**
 * PageLayoutMenu — toolbar-anchored dropdown for the page-wide header,
 * footer, and page-number controls (#61, follow-up).
 *
 * Replaces the centered modal with a Word / Google Docs Insert →
 * Header & Footer style menu:
 *
 *   ┌── (toolbar) ────────────────────────────────────────┐
 *   │ [Text] [Image] [Table] [Page Layout v]              │
 *   └────────────────────────┬────────────────────────────┘
 *                            ▼ (anchored popover)
 *                     ┌──────────────────┐  ┌──────────────────┐
 *                     │ Header        ›  │──▶ Show header      │
 *                     │ Footer        ›  │  │ Header settings… │
 *                     │ Page Number   ›  │  └──────────────────┘
 *                     └──────────────────┘
 *
 * Clicking a top-level item opens a flyout sub-menu to the right. The
 * sub-menu contains the visibility toggle and a Settings… button that
 * opens the full per-band configuration modal (`BandSettingsModal`).
 *
 * State machine lives in `uiStore.pageLayoutMenu`. Outside-click /
 * Escape close the menu.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useTemplateStore } from '../../store/templateStore.js'
import { defaultPageNumberConfig } from '@template-goblin/types'

type Target = 'header' | 'footer' | 'pageNumber'

interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

/** Read the anchor rect from a `data-page-layout-anchor` toolbar button. */
function findAnchorRect(): AnchorRect | null {
  const el = document.querySelector('[data-page-layout-anchor="true"]')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export function PageLayoutMenu() {
  const menu = useUiStore((s) => s.pageLayoutMenu)
  const setMenu = useUiStore((s) => s.setPageLayoutMenu)
  const setSettings = useUiStore((s) => s.setPageLayoutSettings)
  const [anchor, setAnchor] = useState<AnchorRect | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const open = menu.kind !== 'closed'

  // Re-measure the anchor every time the menu opens — the toolbar can
  // reflow between renders (font load, resize), so a cached rect would go
  // stale. `useLayoutEffect` fires before paint so the menu mounts at
  // the right coords without a flicker.
  useLayoutEffect(() => {
    if (!open) return
    setAnchor(findAnchorRect())
  }, [open])

  // Outside-click + Escape close the menu. The settings modal owns its
  // own dismiss logic.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent): void {
      const t = e.target
      if (!(t instanceof Node)) return
      if (rootRef.current?.contains(t)) return
      // Clicks on the toolbar anchor are handled there.
      const anchorEl = document.querySelector('[data-page-layout-anchor="true"]')
      if (anchorEl?.contains(t)) return
      setMenu({ kind: 'closed' })
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setMenu({ kind: 'closed' })
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setMenu])

  if (!open || !anchor) return null

  const popoverTop = anchor.top + anchor.height + 4
  const popoverLeft = anchor.left
  const flyoutOffset = 8

  function openFlyout(target: Target): void {
    if (menu.kind === 'flyout' && menu.target === target) {
      setMenu({ kind: 'main' })
    } else {
      setMenu({ kind: 'flyout', target })
    }
  }

  return (
    <div
      ref={rootRef}
      data-testid="page-layout-menu"
      style={{
        position: 'fixed',
        top: popoverTop,
        left: popoverLeft,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: flyoutOffset,
      }}
    >
      <MainPane active={menu.kind === 'flyout' ? menu.target : null} onSelect={openFlyout} />
      {menu.kind === 'flyout' && (
        <FlyoutPane
          target={menu.target}
          onClose={() => setMenu({ kind: 'main' })}
          onOpenSettings={() => setSettings(menu.target)}
        />
      )}
    </div>
  )
}

function MainPane({ active, onSelect }: { active: Target | null; onSelect: (t: Target) => void }) {
  return (
    <div className="tg-popover">
      <MenuItem
        label="Header"
        testId="page-layout-menu-header"
        active={active === 'header'}
        onClick={() => onSelect('header')}
      />
      <MenuItem
        label="Footer"
        testId="page-layout-menu-footer"
        active={active === 'footer'}
        onClick={() => onSelect('footer')}
      />
      <MenuItem
        label="Page Number"
        testId="page-layout-menu-page-number"
        active={active === 'pageNumber'}
        onClick={() => onSelect('pageNumber')}
      />
    </div>
  )
}

function MenuItem({
  label,
  active,
  onClick,
  testId,
}: {
  label: string
  active: boolean
  onClick: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      className={`tg-popover-item ${active ? 'tg-popover-item--active' : ''}`}
      onClick={onClick}
      data-testid={testId}
    >
      <span>{label}</span>
      <span aria-hidden="true" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        ›
      </span>
    </button>
  )
}

function FlyoutPane({
  target,
  onClose,
  onOpenSettings,
}: {
  target: Target
  onClose: () => void
  onOpenSettings: () => void
}) {
  const header = useTemplateStore((s) => s.header)
  const footer = useTemplateStore((s) => s.footer)
  const pageNumber = useTemplateStore((s) => s.pageNumber)
  const setHeaderEnabled = useTemplateStore((s) => s.setHeaderEnabled)
  const setFooterEnabled = useTemplateStore((s) => s.setFooterEnabled)
  const setPageNumber = useTemplateStore((s) => s.setPageNumber)

  const isOn =
    target === 'header'
      ? !!header?.enabled
      : target === 'footer'
        ? !!footer?.enabled
        : !!pageNumber?.enabled

  function toggle(): void {
    // #61 follow-up: hide/show preserves the band's style + applyToFirstPage
    // and migrates any band fields to body on hide so the user keeps editing
    // them as normal elements.
    if (target === 'header') {
      setHeaderEnabled(!isOn)
    } else if (target === 'footer') {
      setFooterEnabled(!isOn)
    } else {
      setPageNumber(isOn ? undefined : defaultPageNumberConfig())
    }
  }

  const title = target === 'header' ? 'Header' : target === 'footer' ? 'Footer' : 'Page Number'

  return (
    <div className="tg-popover" data-testid={`page-layout-flyout-${target}`}>
      <div className="tg-popover-section-title">{title}</div>
      <button
        type="button"
        className="tg-popover-item"
        onClick={toggle}
        data-testid={`page-layout-flyout-${target}-toggle`}
      >
        {isOn ? `Hide ${title.toLowerCase()}` : `Show ${title.toLowerCase()}`}
      </button>
      <div className="tg-popover-divider" />
      <button
        type="button"
        className="tg-popover-item"
        disabled={!isOn}
        onClick={() => {
          onClose()
          onOpenSettings()
        }}
        data-testid={`page-layout-flyout-${target}-settings`}
      >
        {title} settings…
      </button>
    </div>
  )
}
