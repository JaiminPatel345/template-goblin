/**
 * HeaderFooterSection — settings editor for one page band (#61).
 *
 * Shared between header + footer because their controls are identical (the
 * `kind` prop just picks which store slot to write). Renders height /
 * padding / background / divider / apply-to-first-page controls.
 *
 * Field creation lives on the canvas — users draw fields inside the band's
 * Y-zone and `useFieldCreationPopup` routes them to `addHeaderField` /
 * `addFooterField`. The settings panel deliberately omits an in-app
 * "Add text / Add image" list to keep one entry-point per concern.
 */
import type { PageBand, PageBandDivider } from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'

type BandKind = 'header' | 'footer'

interface Props {
  kind: BandKind
  band: PageBand | undefined
  onSetBand: (band: PageBand | undefined) => void
  onSetStyle: (patch: Partial<PageBand['style']>) => void
}

interface DividerControlsProps {
  divider: PageBandDivider
  ariaPrefix: string
  onChange: (d: PageBandDivider) => void
}

function DividerControls({ divider, ariaPrefix, onChange }: DividerControlsProps) {
  return (
    <>
      <div className="tg-form-row">
        <label>Divider colour</label>
        <ColorPickerPopover
          value={divider.color ?? '#888888'}
          onChange={(c) => onChange({ ...divider, color: c })}
          ariaLabel={`${ariaPrefix} divider colour`}
        />
      </div>
      <div className="tg-form-row">
        <label>Divider width</label>
        <NumberInput
          value={divider.width}
          min={0.1}
          step={0.1}
          defaultValue={0.5}
          onChange={(v) => onChange({ ...divider, width: v })}
        />
      </div>
      <div className="tg-form-row">
        <label>Divider gap</label>
        <NumberInput
          value={divider.gap}
          min={0}
          defaultValue={4}
          onChange={(v) => onChange({ ...divider, gap: v })}
        />
      </div>
    </>
  )
}

function defaultBand(kind: BandKind): PageBand {
  return {
    enabled: true,
    style: {
      height: kind === 'header' ? 40 : 30,
      backgroundColor: null,
      // #61 (follow-up): divider on by default — the visual separator is
      // what makes a band feel like a band. User can toggle it off from
      // the Divider line checkbox below.
      divider: { color: '#888888', width: 0.5, gap: 4 },
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 12,
      paddingRight: 12,
    },
    fields: [],
    applyToFirstPage: true,
  }
}

export function HeaderFooterSection({ kind, band, onSetBand, onSetStyle }: Props) {
  const enabled = !!band
  const heading = kind === 'header' ? 'Header' : 'Footer'

  return (
    <div className="tg-panel-section">
      <div className="tg-panel-section-title">{heading}</div>

      <div className="tg-toggle-row">
        <label>Show {kind}</label>
        <input
          type="checkbox"
          className="tg-checkbox"
          checked={enabled}
          onChange={(e) => onSetBand(e.target.checked ? defaultBand(kind) : undefined)}
        />
      </div>

      {enabled && band && (
        <>
          <div className="tg-form-row">
            <label>Height</label>
            <NumberInput
              value={band.style.height}
              min={1}
              defaultValue={kind === 'header' ? 40 : 30}
              onChange={(v) => onSetStyle({ height: v })}
            />
          </div>

          <div className="tg-form-row">
            <label>Padding (top / right / bottom / left)</label>
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              <NumberInput
                value={band.style.paddingTop}
                min={0}
                defaultValue={4}
                onChange={(v) => onSetStyle({ paddingTop: v })}
              />
              <NumberInput
                value={band.style.paddingRight}
                min={0}
                defaultValue={12}
                onChange={(v) => onSetStyle({ paddingRight: v })}
              />
              <NumberInput
                value={band.style.paddingBottom}
                min={0}
                defaultValue={4}
                onChange={(v) => onSetStyle({ paddingBottom: v })}
              />
              <NumberInput
                value={band.style.paddingLeft}
                min={0}
                defaultValue={12}
                onChange={(v) => onSetStyle({ paddingLeft: v })}
              />
            </div>
          </div>

          <div className="tg-form-row">
            <label>Background</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ColorPickerPopover
                value={band.style.backgroundColor ?? '#ffffff'}
                onChange={(c) => onSetStyle({ backgroundColor: c })}
                ariaLabel={`${heading} background colour`}
              />
              {band.style.backgroundColor && (
                <button
                  className="tg-btn"
                  style={{ fontSize: 11, padding: '2px 6px' }}
                  onClick={() => onSetStyle({ backgroundColor: null })}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="tg-toggle-row">
            <label>Divider line</label>
            <input
              type="checkbox"
              className="tg-checkbox"
              checked={!!band.style.divider}
              onChange={(e) =>
                onSetStyle({
                  divider: e.target.checked ? { color: '#888888', width: 0.5, gap: 4 } : null,
                })
              }
            />
          </div>

          {band.style.divider && (
            <DividerControls
              divider={band.style.divider}
              ariaPrefix={heading}
              onChange={(d) => onSetStyle({ divider: d })}
            />
          )}

          <div className="tg-toggle-row">
            <label>Apply to first page</label>
            <input
              type="checkbox"
              className="tg-checkbox"
              checked={band.applyToFirstPage}
              onChange={(e) => onSetBand({ ...band, applyToFirstPage: e.target.checked })}
            />
          </div>
        </>
      )}
    </div>
  )
}
