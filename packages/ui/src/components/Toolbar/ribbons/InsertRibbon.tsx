import { useTemplateStore } from '../../../store/templateStore.js'
import { useUiStore } from '../../../store/uiStore.js'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'
import { PageLayoutIcon } from '../icons.js'

/**
 * Insert ribbon (#128). The most-used insert tools (Text / Image / Table)
 * live in the pinned slot on the menu bar so they're one click away from
 * every tab — this ribbon focuses on the heavier "page layout" insertions
 * (header / footer / page number) that share a single anchored menu.
 */
export function InsertRibbon() {
  const locked = useTemplateStore((s) => s.meta.locked)
  const pageLayoutMenuOpen = useUiStore((s) => s.pageLayoutMenu.kind !== 'closed')
  const hasBackground = useTemplateStore(
    (s) =>
      s.backgroundDataUrl !== null ||
      s.pages.some(
        (p) => p.index === 0 && (p.backgroundType === 'color' || p.backgroundType === 'image'),
      ),
  )

  function togglePageLayout() {
    useUiStore
      .getState()
      .setPageLayoutMenu(pageLayoutMenuOpen ? { kind: 'closed' } : { kind: 'main' })
  }

  return (
    <div style={{ display: 'flex' }}>
      <RibbonGroup label="Page elements">
        <RibbonButton
          icon={<PageLayoutIcon />}
          label="Page Layout"
          onClick={togglePageLayout}
          active={pageLayoutMenuOpen}
          disabled={locked || !hasBackground}
          title="Page layout (header, footer, page number)"
          testid="toolbar-page-layout"
          dataAttrs={{ 'data-page-layout-anchor': 'true' }}
        />
      </RibbonGroup>
    </div>
  )
}
