import { useState } from 'react'
import type { TableColumn, TableField, TextAlign } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { NumberInput } from '../NumberInput.js'

interface Props {
  field: TableField
}

/**
 * Per-column editor (key / label / width / align + reorder + delete + add).
 * Extracted from `LoopFieldProps.tsx` to keep that file under the 300-line
 * cap (Hard Rule #11). Behaviour unchanged.
 */
export function TableColumnsSection({ field }: Props) {
  const updateFieldStyle = useTemplateStore((s) => s.updateFieldStyle)
  const style = field.style
  const columns = style.columns || []
  const rowStyle = style.rowStyle
  const [collapsed, setCollapsed] = useState(false)

  function updateColumn(index: number, updates: Partial<TableColumn>) {
    const next = columns.map((col, i) => (i === index ? { ...col, ...updates } : col))
    updateFieldStyle(field.id, { columns: next })
  }

  function addColumn() {
    const newCol: TableColumn = {
      key: `col${columns.length + 1}`,
      label: `Column ${columns.length + 1}`,
      width: 100,
      style: { align: 'center', verticalAlign: 'middle' },
      headerStyle: { align: 'center', verticalAlign: 'middle' },
    }
    updateFieldStyle(field.id, { columns: [...columns, newCol] })
  }

  function removeColumn(index: number) {
    updateFieldStyle(field.id, { columns: columns.filter((_, i) => i !== index) })
  }

  function moveColumnUp(index: number) {
    if (index <= 0) return
    const next = [...columns]
    const prev = next[index - 1]
    const curr = next[index]
    if (!prev || !curr) return
    next[index - 1] = curr
    next[index] = prev
    updateFieldStyle(field.id, { columns: next })
  }

  function moveColumnDown(index: number) {
    if (index >= columns.length - 1) return
    const next = [...columns]
    const nxt = next[index + 1]
    const curr = next[index]
    if (!nxt || !curr) return
    next[index + 1] = curr
    next[index] = nxt
    updateFieldStyle(field.id, { columns: next })
  }

  function columnAlign(col: TableColumn): TextAlign {
    return (col.style?.align as TextAlign | undefined) ?? rowStyle.align ?? 'center'
  }
  function setColumnAlign(index: number, align: TextAlign) {
    const existing = columns[index]?.style ?? {}
    updateColumn(index, { style: { ...existing, align } })
  }

  return (
    <div className="tg-panel-section">
      <button
        type="button"
        className="tg-panel-section-title"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          color: 'inherit',
          font: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Columns ({columns.length})</span>
        <span aria-hidden style={{ fontSize: 10, opacity: 0.7 }}>
          {collapsed ? '▶' : '▼'}
        </span>
      </button>

      {!collapsed &&
        columns.map((col, i) => (
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
                  data-testid={`loop-remove-column-${i}`}
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

      {!collapsed && (
        <button
          className="tg-btn"
          style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
          onClick={addColumn}
          data-testid="loop-add-column"
        >
          + Add Column
        </button>
      )}
    </div>
  )
}
