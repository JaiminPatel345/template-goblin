import type {
  FieldDefinition,
  TableField,
  TableFieldStyle,
  TableColumn,
  CellStyle,
  TextAlign,
  FontWeight,
} from '@template-goblin/types'
import { isSafeKey } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { InfoTip } from './TextFieldProps.js'
import { NumberInput } from '../NumberInput.js'
import { defaultCellStyle } from '../../utils/defaults.js'

/**
 * Historical filename: `LoopFieldProps.tsx`. The field type was renamed from
 * `loop` to `table` in spec 002 (Phase 1); the component and export name are
 * kept stable to avoid a rename-file churn during the Phase 1 compile fix.
 */

interface Props {
  field: TableField
}

const BUILTIN_FONTS = ['Helvetica', 'Times-Roman', 'Courier']

export function LoopFieldProps({ field }: Props) {
  const updateField = useTemplateStore((s) => s.updateField)
  const updateFieldStyle = useTemplateStore((s) => s.updateFieldStyle)
  const fonts = useTemplateStore((s) => s.fonts)

  // Defensive fallback for fields rehydrated without a `source` object.
  if (!field.source) {
    return (
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Legacy field</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          This table field was saved in an older format and cannot be edited. Please recreate it.
        </p>
      </div>
    )
  }

  const style: TableFieldStyle = field.style
  const columns = style.columns || []
  const headerStyle = style.headerStyle
  const rowStyle = style.rowStyle

  // Phase 1 UI edits only dynamic table fields via the right panel.
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

  function updateHeader(updates: Partial<CellStyle>) {
    updateFieldStyle(field.id, { headerStyle: { ...headerStyle, ...updates } })
  }

  function updateRow(updates: Partial<CellStyle>) {
    updateFieldStyle(field.id, { rowStyle: { ...rowStyle, ...updates } })
  }

  function updateColumn(index: number, updates: Partial<TableColumn>) {
    const newColumns = columns.map((col: TableColumn, i: number) =>
      i === index ? { ...col, ...updates } : col,
    )
    updateFieldStyle(field.id, { columns: newColumns })
  }

  function addColumn() {
    const newCol: TableColumn = {
      key: `col${columns.length + 1}`,
      label: `Column ${columns.length + 1}`,
      width: 100,
      style: null,
      headerStyle: null,
    }
    updateFieldStyle(field.id, { columns: [...columns, newCol] })
  }

  function removeColumn(index: number) {
    const newColumns = columns.filter((_col: TableColumn, i: number) => i !== index)
    updateFieldStyle(field.id, { columns: newColumns })
  }

  function moveColumnUp(index: number) {
    if (index <= 0) return
    const newColumns = [...columns]
    const prev = newColumns[index - 1]
    const curr = newColumns[index]
    if (!prev || !curr) return
    newColumns[index - 1] = curr
    newColumns[index] = prev
    updateFieldStyle(field.id, { columns: newColumns })
  }

  function moveColumnDown(index: number) {
    if (index >= columns.length - 1) return
    const newColumns = [...columns]
    const next = newColumns[index + 1]
    const curr = newColumns[index]
    if (!next || !curr) return
    newColumns[index + 1] = curr
    newColumns[index] = next
    updateFieldStyle(field.id, { columns: newColumns })
  }

  // Column-level align: lives on the per-column `style` override. We treat a
  // missing override as "inherit row align".
  function columnAlign(col: TableColumn): TextAlign {
    return (col.style?.align as TextAlign | undefined) ?? rowStyle.align ?? 'left'
  }
  function setColumnAlign(index: number, align: TextAlign) {
    const existing = columns[index]?.style ?? {}
    updateColumn(index, { style: { ...existing, align } })
  }

  const allFontFamilies = [...BUILTIN_FONTS, ...fonts.map((f) => f.name)]

  return (
    <>
      {/* JSON Key & Basic Settings */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Table Properties</div>

        <div className="tg-form-row">
          <label>JSON Key</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>tables.</span>
            <input
              className="tg-input"
              value={displayKey}
              disabled={!dynamicSource}
              onChange={(e) => onJsonKeyChange(e.target.value)}
            />
          </div>
        </div>

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
      </div>

      {/* Column Definitions */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Columns</div>

        {columns.map((col: TableColumn, i: number) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              padding: 8,
              background: 'var(--bg-primary)',
              borderRadius: 4,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Column {i + 1}
              </span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  className="tg-btn"
                  style={{ fontSize: 10, padding: '2px 5px' }}
                  onClick={() => moveColumnUp(i)}
                  disabled={i === 0}
                  title="Move up"
                >
                  &uarr;
                </button>
                <button
                  className="tg-btn"
                  style={{ fontSize: 10, padding: '2px 5px' }}
                  onClick={() => moveColumnDown(i)}
                  disabled={i === columns.length - 1}
                  title="Move down"
                >
                  &darr;
                </button>
                <button
                  className="tg-btn tg-btn--danger"
                  style={{ fontSize: 10, padding: '2px 6px' }}
                  onClick={() => removeColumn(i)}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="tg-form-row">
              <label>Key</label>
              <input
                className="tg-input"
                value={col.key}
                onChange={(e) => updateColumn(i, { key: e.target.value })}
              />
            </div>

            <div className="tg-form-row">
              <label>Label</label>
              <input
                className="tg-input"
                value={col.label}
                onChange={(e) => updateColumn(i, { label: e.target.value })}
              />
            </div>

            <div className="tg-form-row">
              <label>Width</label>
              <NumberInput
                min={10}
                value={col.width}
                defaultValue={100}
                onChange={(v) => updateColumn(i, { width: v })}
              />
            </div>

            <div className="tg-form-row">
              <label>Align</label>
              <select
                className="tg-select"
                value={columnAlign(col)}
                onChange={(e) => setColumnAlign(i, e.target.value as TextAlign)}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        ))}

        <button
          className="tg-btn"
          style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
          onClick={addColumn}
        >
          + Add Column
        </button>
      </div>

      {/* Header Style */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Header Style</div>

        <div className="tg-form-row">
          <label>Font Family</label>
          <select
            className="tg-select"
            value={headerStyle.fontFamily}
            onChange={(e) => updateHeader({ fontFamily: e.target.value })}
          >
            {allFontFamilies.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="tg-form-row">
          <label>Font Size</label>
          <NumberInput
            min={1}
            value={headerStyle.fontSize}
            defaultValue={10}
            onChange={(v) => updateHeader({ fontSize: v })}
          />
        </div>

        <div className="tg-form-row">
          <label>Font Weight</label>
          <select
            className="tg-select"
            value={headerStyle.fontWeight}
            onChange={(e) => updateHeader({ fontWeight: e.target.value as FontWeight })}
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Align</label>
          <select
            className="tg-select"
            value={headerStyle.align}
            onChange={(e) => updateHeader({ align: e.target.value as TextAlign })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Color</label>
          <input
            type="color"
            className="tg-color-input"
            value={headerStyle.color}
            onChange={(e) => updateHeader({ color: e.target.value })}
          />
        </div>

        <div className="tg-form-row">
          <label>Background Color</label>
          <input
            type="color"
            className="tg-color-input"
            value={headerStyle.backgroundColor}
            onChange={(e) => updateHeader({ backgroundColor: e.target.value })}
          />
        </div>
      </div>

      {/* Row Style */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Row Style</div>

        <div className="tg-form-row">
          <label>Font Family</label>
          <select
            className="tg-select"
            value={rowStyle.fontFamily}
            onChange={(e) => updateRow({ fontFamily: e.target.value })}
          >
            {allFontFamilies.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="tg-form-row">
          <label>Font Size</label>
          <NumberInput
            min={1}
            value={rowStyle.fontSize}
            defaultValue={10}
            onChange={(v) => updateRow({ fontSize: v })}
          />
        </div>

        <div className="tg-form-row">
          <label>Font Weight</label>
          <select
            className="tg-select"
            value={rowStyle.fontWeight}
            onChange={(e) => updateRow({ fontWeight: e.target.value as FontWeight })}
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Color</label>
          <input
            type="color"
            className="tg-color-input"
            value={rowStyle.color}
            onChange={(e) => updateRow({ color: e.target.value })}
          />
        </div>

        <div className="tg-form-row">
          <label>Overflow Mode</label>
          <select
            className="tg-select"
            value={style.cellStyle.overflowMode}
            onChange={(e) =>
              updateFieldStyle(field.id, {
                cellStyle: {
                  ...style.cellStyle,
                  overflowMode: e.target.value as 'dynamic_font' | 'truncate',
                },
              })
            }
          >
            <option value="dynamic_font">Dynamic Font</option>
            <option value="truncate">Truncate</option>
          </select>
        </div>
      </div>

      {/* Cell Style (row-level padding/border) */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Cell Style</div>

        <div className="tg-form-row">
          <label>Border Width</label>
          <NumberInput
            min={0}
            step={0.5}
            value={rowStyle.borderWidth}
            defaultValue={1}
            onChange={(v) => updateRow({ borderWidth: v })}
          />
        </div>

        <div className="tg-form-row">
          <label>Border Color</label>
          <input
            type="color"
            className="tg-color-input"
            value={rowStyle.borderColor}
            onChange={(e) => updateRow({ borderColor: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="tg-form-row">
            <label>Padding Top</label>
            <NumberInput
              min={0}
              value={rowStyle.paddingTop}
              defaultValue={4}
              onChange={(v) => updateRow({ paddingTop: v })}
            />
          </div>

          <div className="tg-form-row">
            <label>Padding Bottom</label>
            <NumberInput
              min={0}
              value={rowStyle.paddingBottom}
              defaultValue={4}
              onChange={(v) => updateRow({ paddingBottom: v })}
            />
          </div>

          <div className="tg-form-row">
            <label>Padding Left</label>
            <NumberInput
              min={0}
              value={rowStyle.paddingLeft}
              defaultValue={4}
              onChange={(v) => updateRow({ paddingLeft: v })}
            />
          </div>

          <div className="tg-form-row">
            <label>Padding Right</label>
            <NumberInput
              min={0}
              value={rowStyle.paddingRight}
              defaultValue={4}
              onChange={(v) => updateRow({ paddingRight: v })}
            />
          </div>
        </div>
      </div>
    </>
  )
}

// Export `defaultCellStyle` through this module for components that already
// import from `LoopFieldProps.js` and expect the helper alongside.
export { defaultCellStyle }
