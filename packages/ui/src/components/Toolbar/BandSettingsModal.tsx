/**
 * BandSettingsModal — focused modal for one band's (or page-number's)
 * full configuration (#61, follow-up).
 *
 * Opened from `PageLayoutMenu`'s flyout "Settings…" button. The modal
 * displays only the controls for the targeted band so the user isn't
 * distracted by unrelated settings. Closes via X / Done / Escape.
 */
import { useEffect } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useTemplateStore } from '../../store/templateStore.js'
import { HeaderFooterSection } from '../RightPanel/HeaderFooterSection.js'
import { PageNumberSection } from '../RightPanel/PageNumberSection.js'

export function BandSettingsModal() {
  const target = useUiStore((s) => s.pageLayoutSettings)
  const setTarget = useUiStore((s) => s.setPageLayoutSettings)

  // Read everything the sections need from the store ahead of the bail-out
  // so the hook order stays stable across renders.
  const header = useTemplateStore((s) => s.header)
  const footer = useTemplateStore((s) => s.footer)
  const pageNumber = useTemplateStore((s) => s.pageNumber)
  const setHeader = useTemplateStore((s) => s.setHeader)
  const setHeaderStyle = useTemplateStore((s) => s.setHeaderStyle)
  const setFooter = useTemplateStore((s) => s.setFooter)
  const setFooterStyle = useTemplateStore((s) => s.setFooterStyle)
  const setPageNumber = useTemplateStore((s) => s.setPageNumber)
  const setPageNumberConfig = useTemplateStore((s) => s.setPageNumberConfig)

  useEffect(() => {
    if (target === null) return
    function onKey(e: KeyboardEvent): void {
      if (e.key !== 'Escape') return
      // Bug fix: if a nested popover (e.g. the colour picker) is open,
      // let IT handle Escape and stay inside this modal. Without this
      // gate, pressing Escape inside the colour picker closes both the
      // popover and the surrounding settings modal in one go.
      if (document.querySelector('[data-color-popover="true"]')) return
      setTarget(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [target, setTarget])

  if (target === null) return null

  const title =
    target === 'header'
      ? 'Header settings'
      : target === 'footer'
        ? 'Footer settings'
        : 'Page Number settings'

  return (
    <div className="tg-dialog-overlay" onClick={() => setTarget(null)}>
      <div
        className="tg-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="band-settings-title"
        data-testid="band-settings-modal"
        style={{ minWidth: 360, maxWidth: 440, maxHeight: '80vh', overflowY: 'auto' }}
      >
        <h2 className="tg-dialog-title" id="band-settings-title">
          {title}
        </h2>
        {target === 'header' && (
          <HeaderFooterSection
            kind="header"
            band={header}
            onSetBand={setHeader}
            onSetStyle={setHeaderStyle}
          />
        )}
        {target === 'footer' && (
          <HeaderFooterSection
            kind="footer"
            band={footer}
            onSetBand={setFooter}
            onSetStyle={setFooterStyle}
          />
        )}
        {target === 'pageNumber' && (
          <PageNumberSection
            config={pageNumber}
            hasHeader={!!header}
            hasFooter={!!footer}
            onSet={setPageNumber}
            onPatch={setPageNumberConfig}
          />
        )}
        <div className="tg-dialog-actions" style={{ marginTop: 12 }}>
          <button className="tg-btn tg-btn--primary" onClick={() => setTarget(null)}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
