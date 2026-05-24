import { useUiStore } from '../../store/uiStore.js'
import { FileRibbon } from './ribbons/FileRibbon.js'
import { EditRibbon } from './ribbons/EditRibbon.js'
import { InsertRibbon } from './ribbons/InsertRibbon.js'
import { FormatRibbon } from './ribbons/FormatRibbon.js'
import { ViewRibbon } from './ribbons/ViewRibbon.js'
import { HelpRibbon } from './ribbons/HelpRibbon.js'

/**
 * Row-2 of the new top bar (#128) — swaps the displayed ribbon to match
 * `uiStore.activeMenuTab`. Each ribbon owns its own state subscriptions
 * so this switcher is just a thin dispatcher.
 *
 * Themed via CSS variables; the surrounding bar uses `--bg-surface` so
 * it sits flush with the menu row above while staying distinct from the
 * canvas below.
 */
export function RibbonBar() {
  const activeTab = useUiStore((s) => s.activeMenuTab)
  const collapsed = useUiStore((s) => s.ribbonCollapsed)

  if (collapsed) return null

  return (
    <div
      role="tabpanel"
      aria-label={`${activeTab} ribbon`}
      data-testid={`ribbon-${activeTab}`}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        minHeight: 56,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '4px 8px',
        gap: 4,
        overflowX: 'auto',
      }}
    >
      {activeTab === 'file' && <FileRibbon />}
      {activeTab === 'edit' && <EditRibbon />}
      {activeTab === 'insert' && <InsertRibbon />}
      {activeTab === 'format' && <FormatRibbon />}
      {activeTab === 'view' && <ViewRibbon />}
      {activeTab === 'help' && <HelpRibbon />}
    </div>
  )
}
