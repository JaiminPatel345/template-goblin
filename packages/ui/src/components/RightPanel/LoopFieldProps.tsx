import type { FieldDefinition, TableField, TableFieldStyle } from '@template-goblin/types'
import { isSafeKey } from '@template-goblin/types'
import { HyperlinkSection } from './HyperlinkSection.js'
import { useTemplateStore } from '../../store/templateStore.js'
import { InfoTip } from './TextFieldProps.js'
import { NumberInput } from '../NumberInput.js'
import { defaultCellStyle } from '../../utils/defaults.js'
import { SourceModeToggle } from './SourceModeToggle.js'
import { TableStyleSections } from './TableStyleSections.js'
import { TableColumnsSection } from './TableColumnsSection.js'

/**
 * Historical filename: `LoopFieldProps.tsx`. The field type was renamed from
 * `loop` to `table` in spec 002 (Phase 1); the component and export name are
 * kept stable to avoid a rename-file churn during the Phase 1 compile fix.
 *
 * The header/row/cell style sub-panels live in `TableStyleSections.tsx`;
 * the per-column editor lives in `TableColumnsSection.tsx` (Hard Rule #11).
 */

interface Props {
  field: TableField
}

const BUILTIN_FONTS = ['Helvetica', 'Times-Roman', 'Courier']

export function LoopFieldProps({ field }: Props) {
  const updateField = useTemplateStore((s) => s.updateField)
  const updateFieldStyle = useTemplateStore((s) => s.updateFieldStyle)
  const fonts = useTemplateStore((s) => s.fonts)

  // QA BUG-08: surface a one-click upgrade for fields rehydrated
  // without a source object.
  if (!field.source) {
    return (
      <div className="tg-panel-section" data-testid="legacy-field-upgrade">
        <div className="tg-panel-section-title">Legacy field</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
          This table field was saved in an older format. Click below to convert it to the new
          editable format.
        </p>
        <button
          type="button"
          className="tg-btn tg-btn--primary"
          data-testid="legacy-field-upgrade-table"
          onClick={() =>
            updateField(field.id, {
              source: {
                mode: 'dynamic',
                jsonKey: '',
                required: false,
                placeholder: [],
              },
            } as Partial<FieldDefinition>)
          }
        >
          Convert to new format
        </button>
      </div>
    )
  }

  const style: TableFieldStyle = field.style

  const isDynamic = field.source.mode === 'dynamic'
  const dynamicSource = isDynamic
    ? (field.source as {
        mode: 'dynamic'
        jsonKey: string
        required: boolean
        placeholder: unknown
      })
    : null
  const displayKey = dynamicSource?.jsonKey ?? ''

  function onJsonKeyChange(value: string) {
    const cleaned = value.replace(/^tables\./, '')
    if (cleaned !== '' && !isSafeKey(cleaned)) return
    if (!dynamicSource) return
    updateField(field.id, {
      source: { ...dynamicSource, jsonKey: cleaned },
    } as Partial<FieldDefinition>)
  }

  const allFontFamilies = [...BUILTIN_FONTS, ...fonts.map((f) => f.name)]

  return (
    <>
      {/* Source mode toggle (GH #26) — flipping migrates value↔placeholder. */}
      <SourceModeToggle field={field} />

      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Table Properties</div>

        {isDynamic && (
          <div className="tg-form-row">
            <label>JSON Key</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                tables.
              </span>
              <input
                className="tg-input"
                data-testid="loop-jsonkey-input"
                value={displayKey}
                onChange={(e) => onJsonKeyChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {!isDynamic && (
          <div className="tg-form-row">
            <label>Value</label>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              Static tables carry a baked-in row set. Use the column editor below to shape the
              structure; row data editing for static tables is on the roadmap.
            </p>
          </div>
        )}

        <div className="tg-form-row">
          <label>
            Max Rows
            <InfoTip text="Maximum rows visible per page." />
          </label>
          <NumberInput
            min={1}
            value={style.maxRows}
            defaultValue={10}
            onChange={(v) => updateFieldStyle(field.id, { maxRows: v })}
          />
        </div>

        <div className="tg-form-row">
          <label>Max Columns</label>
          <NumberInput
            min={1}
            value={style.maxColumns}
            defaultValue={5}
            onChange={(v) => updateFieldStyle(field.id, { maxColumns: v })}
          />
        </div>

        <div className="tg-toggle-row">
          <label>
            Multi-Page
            <InfoTip text="When enabled, table continues on next page if rows exceed the field height." />
          </label>
          <input
            type="checkbox"
            className="tg-checkbox"
            checked={style.multiPage}
            onChange={(e) => updateFieldStyle(field.id, { multiPage: e.target.checked })}
          />
        </div>

        <div className="tg-toggle-row">
          <label>
            Show Header
            <InfoTip text="When disabled, the header row is skipped entirely at render time." />
          </label>
          <input
            type="checkbox"
            className="tg-checkbox"
            checked={style.showHeader}
            onChange={(e) => updateFieldStyle(field.id, { showHeader: e.target.checked })}
          />
        </div>

        <div className="tg-toggle-row">
          <label>
            Fit to Content
            <InfoTip text="When on, the table's perimeter ends at the last row instead of stretching to the full rect — collapses the empty area below short tables." />
          </label>
          <input
            type="checkbox"
            className="tg-checkbox"
            checked={style.fitToContent !== false}
            onChange={(e) => updateFieldStyle(field.id, { fitToContent: e.target.checked })}
          />
        </div>
      </div>

      <TableColumnsSection field={field} />
      <TableStyleSections field={field} allFontFamilies={allFontFamilies} />
      <HyperlinkSection field={field} />
    </>
  )
}

// Export `defaultCellStyle` through this module for components that already
// import from `LoopFieldProps.js` and expect the helper alongside.
export { defaultCellStyle }
