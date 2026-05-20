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
  hasHeader: boolean
  hasFooter: boolean
  onSet: (config: PageNumberConfig | undefined) => void
  onPatch: (patch: Partial<PageNumberConfig>) => void
}

export function PageNumberSection({ config, hasHeader, hasFooter, onSet, onPatch }: Props) {
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
              const next = config ?? defaultPageNumberConfig()
              // Steer placement to whichever band actually exists.
              const placement = hasFooter ? 'footer' : hasHeader ? 'header' : 'footer'
              onSet({ ...next, enabled: true, placement })
            } else {
              onPatch({ enabled: false })
            }
          }}
        />
      </div>

      {enabled && config && (
        <>
          {!hasHeader && !hasFooter && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-warn, #b04a00)',
                margin: '4px 0',
                lineHeight: 1.4,
              }}
            >
              Enable a header or footer first — page number lives inside a band.
            </div>
          )}

          <div className="tg-form-row">
            <label>Placement</label>
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              <button
                className={`tg-btn ${config.placement === 'header' ? 'tg-btn--active' : ''}`}
                style={{ flex: 1, fontSize: 11 }}
                disabled={!hasHeader}
                onClick={() => onPatch({ placement: 'header' })}
              >
                Header
              </button>
              <button
                className={`tg-btn ${config.placement === 'footer' ? 'tg-btn--active' : ''}`}
                style={{ flex: 1, fontSize: 11 }}
                disabled={!hasFooter}
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
