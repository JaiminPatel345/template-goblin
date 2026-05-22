/**
 * PageNumberSection — right-panel editor for the page-number toggle (#61).
 *
 * Per user decision C, page number is a single toggle with placement /
 * alignment / colour / numeral-style options — NOT a placeable field
 * type. When enabled, the renderer stamps the formatted number into the
 * chosen band on every page (subject to `showOnFirstPage`).
 */
import type { PageNumberConfig } from '@template-goblin/types'
import { defaultPageNumberConfig } from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import { AlignButtonGroup } from './AlignButtonGroup.js'

interface Props {
  config: PageNumberConfig | undefined
  /**
   * Kept on the props for backwards compat with existing call sites, but
   * the section no longer disables Placement when a band is missing —
   * the store's `setPageNumber` / `setPageNumberConfig` auto-create the
   * targeted band, so the user can freely pick Header or Footer without
   * having to enable the band first.
   */
  hasHeader: boolean
  hasFooter: boolean
  onSet: (config: PageNumberConfig | undefined) => void
  onPatch: (patch: Partial<PageNumberConfig>) => void
}

export function PageNumberSection({ config, onSet, onPatch }: Props) {
  const enabled = !!config?.enabled

  return (
    <div className="tg-panel-section">
      <div className="tg-panel-section-title">Page Number</div>

      <div className="tg-toggle-row">
        <label>Show page number</label>
        <input
          type="checkbox"
          className="tg-checkbox"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              // The store auto-creates the placement band, so we can
              // honour whatever default the user previously chose (or the
              // built-in default of 'footer').
              const next = config ?? defaultPageNumberConfig()
              onSet({ ...next, enabled: true })
            } else {
              onPatch({ enabled: false })
            }
          }}
        />
      </div>

      {enabled && config && (
        <>
          <div className="tg-form-row">
            <label>Placement</label>
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              {/*
                Placement buttons are NEVER disabled — picking Header or
                Footer auto-creates+enables the corresponding band via the
                store's `ensureBandForPageNumber` helper. Lets the user
                land page numbers in either band without manually
                enabling it first.
              */}
              <button
                className={`tg-btn ${config.placement === 'header' ? 'tg-btn--active' : ''}`}
                style={{ flex: 1, fontSize: 11 }}
                onClick={() => onPatch({ placement: 'header' })}
              >
                Header
              </button>
              <button
                className={`tg-btn ${config.placement === 'footer' ? 'tg-btn--active' : ''}`}
                style={{ flex: 1, fontSize: 11 }}
                onClick={() => onPatch({ placement: 'footer' })}
              >
                Footer
              </button>
            </div>
          </div>

          <div className="tg-form-row">
            <label>Alignment</label>
            <AlignButtonGroup
              options={['left', 'center', 'right'] as const}
              value={config.align}
              onChange={(v) => onPatch({ align: v })}
            />
          </div>

          <div className="tg-form-row">
            <label>Numeral style</label>
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              <button
                className={`tg-btn ${config.numeralStyle === 'arabic' ? 'tg-btn--active' : ''}`}
                style={{ flex: 1, fontSize: 11 }}
                onClick={() => onPatch({ numeralStyle: 'arabic' })}
              >
                Arabic (1, 2, 3)
              </button>
              <button
                className={`tg-btn ${config.numeralStyle === 'roman' ? 'tg-btn--active' : ''}`}
                style={{ flex: 1, fontSize: 11 }}
                onClick={() => onPatch({ numeralStyle: 'roman' })}
              >
                Roman (I, II, III)
              </button>
            </div>
          </div>

          <div className="tg-form-row">
            <label>Font size</label>
            <NumberInput
              value={config.fontSize}
              min={4}
              defaultValue={10}
              onChange={(v) => onPatch({ fontSize: v })}
            />
          </div>

          <div className="tg-form-row">
            <label>Colour</label>
            <ColorPickerPopover
              value={config.color}
              onChange={(c) => onPatch({ color: c })}
              ariaLabel="Page number colour"
            />
          </div>

          <div className="tg-toggle-row">
            <label>Show on first page</label>
            <input
              type="checkbox"
              className="tg-checkbox"
              checked={config.showOnFirstPage}
              onChange={(e) => onPatch({ showOnFirstPage: e.target.checked })}
            />
          </div>
        </>
      )}
    </div>
  )
}
