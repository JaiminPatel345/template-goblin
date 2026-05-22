import { useTemplateStore } from '../../../store/templateStore.js'
import { useUiStore } from '../../../store/uiStore.js'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'
import { PageLayoutIcon } from '../icons.js'

/**
 * Insert ribbon (#128). Three first-class buttons: Header / Footer /
 * Page Number. Clicking any of them opens the settings popup
 * (`BandSettingsModal`) — the Show/Hide toggle lives inside the popup
 * as the first row, alongside the rest of that band's configuration.
 * One click, one place, no extra affordances.
 *
 * The pinned Text / Image / Table tools live on the menu bar above and
 * are always reachable regardless of which tab is active.
 */
export function InsertRibbon() {
  const locked = useTemplateStore((s) => s.meta.locked)
  const headerEnabled = useTemplateStore((s) => !!s.header?.enabled)
  const footerEnabled = useTemplateStore((s) => !!s.footer?.enabled)
  const pageNumberEnabled = useTemplateStore((s) => !!s.pageNumber?.enabled)
  const setPageLayoutSettings = useUiStore((s) => s.setPageLayoutSettings)
  const hasBackground = useTemplateStore(
    (s) =>
      s.backgroundDataUrl !== null ||
      s.pages.some(
        (p) => p.index === 0 && (p.backgroundType === 'color' || p.backgroundType === 'image'),
      ),
  )
  const disabled = locked || !hasBackground

  return (
    <div style={{ display: 'flex' }}>
      <RibbonGroup label="Page elements">
        <RibbonButton
          icon={<PageLayoutIcon />}
          label="Header"
          onClick={() => setPageLayoutSettings('header')}
          active={headerEnabled}
          variant={headerEnabled ? 'toggle' : 'default'}
          disabled={disabled}
          title="Configure the page-wide header"
          testid="ribbon-insert-header"
        />
        <RibbonButton
          icon={<PageLayoutIcon />}
          label="Footer"
          onClick={() => setPageLayoutSettings('footer')}
          active={footerEnabled}
          variant={footerEnabled ? 'toggle' : 'default'}
          disabled={disabled}
          title="Configure the page-wide footer"
          testid="ribbon-insert-footer"
        />
        <RibbonButton
          icon={<PageLayoutIcon />}
          label="Page Number"
          onClick={() => setPageLayoutSettings('pageNumber')}
          active={pageNumberEnabled}
          variant={pageNumberEnabled ? 'toggle' : 'default'}
          disabled={disabled}
          title="Configure page numbers"
          testid="ribbon-insert-pagenumber"
        />
      </RibbonGroup>
    </div>
  )
}
