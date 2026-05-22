import { useTemplateStore } from '../../../store/templateStore.js'
import { useUiStore } from '../../../store/uiStore.js'
import { defaultPageNumberConfig } from '@template-goblin/types'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'
import { PageLayoutIcon } from '../icons.js'

/**
 * Insert ribbon (#128, follow-up). The most-used insert tools (Text /
 * Image / Table) live in the pinned slot on the menu bar so they're one
 * click away from every tab. This ribbon exposes Header / Footer /
 * Page Number as three FIRST-CLASS toggles — one click to turn on, one
 * click on the ⚙ to open detailed settings. Replaces the previous
 * single "Page Layout" button that required three clicks to enable a
 * header (open menu → pick Header → click Show).
 */
export function InsertRibbon() {
  const locked = useTemplateStore((s) => s.meta.locked)
  const headerEnabled = useTemplateStore((s) => !!s.header?.enabled)
  const footerEnabled = useTemplateStore((s) => !!s.footer?.enabled)
  const pageNumberEnabled = useTemplateStore((s) => !!s.pageNumber?.enabled)
  const setHeaderEnabled = useTemplateStore((s) => s.setHeaderEnabled)
  const setFooterEnabled = useTemplateStore((s) => s.setFooterEnabled)
  const setPageNumber = useTemplateStore((s) => s.setPageNumber)
  const setPageLayoutSettings = useUiStore((s) => s.setPageLayoutSettings)
  const hasBackground = useTemplateStore(
    (s) =>
      s.backgroundDataUrl !== null ||
      s.pages.some(
        (p) => p.index === 0 && (p.backgroundType === 'color' || p.backgroundType === 'image'),
      ),
  )
  const disabled = locked || !hasBackground

  /**
   * Tiny gear button rendered next to each band toggle. Opens the full
   * settings modal (`BandSettingsModal`) for that target. If the band is
   * currently disabled, also enables it so the user gets settings on a
   * live band in one click rather than two.
   */
  function SettingsButton({
    target,
    testid,
  }: {
    target: 'header' | 'footer' | 'pageNumber'
    testid: string
  }) {
    function handleClick(): void {
      if (target === 'header' && !headerEnabled) setHeaderEnabled(true)
      else if (target === 'footer' && !footerEnabled) setFooterEnabled(true)
      else if (target === 'pageNumber' && !pageNumberEnabled)
        setPageNumber(defaultPageNumberConfig())
      setPageLayoutSettings(target)
    }
    return (
      <RibbonButton
        label="⚙"
        onClick={handleClick}
        disabled={disabled}
        compact
        title={`Open ${target} settings`}
        testid={testid}
        ariaLabel={`${target} settings`}
        style={{
          fontSize: 14,
          minWidth: 26,
          padding: '4px 6px',
          color: 'var(--text-muted)',
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex' }}>
      <RibbonGroup label="Header">
        <RibbonButton
          icon={<PageLayoutIcon />}
          label={headerEnabled ? 'On' : 'Off'}
          onClick={() => setHeaderEnabled(!headerEnabled)}
          active={headerEnabled}
          variant="toggle"
          disabled={disabled}
          title={headerEnabled ? 'Hide page-wide header' : 'Show a page-wide header'}
          testid="ribbon-insert-header"
        />
        <SettingsButton target="header" testid="ribbon-insert-header-settings" />
      </RibbonGroup>
      <RibbonGroup label="Footer">
        <RibbonButton
          icon={<PageLayoutIcon />}
          label={footerEnabled ? 'On' : 'Off'}
          onClick={() => setFooterEnabled(!footerEnabled)}
          active={footerEnabled}
          variant="toggle"
          disabled={disabled}
          title={footerEnabled ? 'Hide page-wide footer' : 'Show a page-wide footer'}
          testid="ribbon-insert-footer"
        />
        <SettingsButton target="footer" testid="ribbon-insert-footer-settings" />
      </RibbonGroup>
      <RibbonGroup label="Page number">
        <RibbonButton
          icon={<PageLayoutIcon />}
          label={pageNumberEnabled ? 'On' : 'Off'}
          onClick={() => setPageNumber(pageNumberEnabled ? undefined : defaultPageNumberConfig())}
          active={pageNumberEnabled}
          variant="toggle"
          disabled={disabled}
          title={pageNumberEnabled ? 'Remove page numbers' : 'Add page numbers'}
          testid="ribbon-insert-pagenumber"
        />
        <SettingsButton target="pageNumber" testid="ribbon-insert-pagenumber-settings" />
      </RibbonGroup>
    </div>
  )
}
