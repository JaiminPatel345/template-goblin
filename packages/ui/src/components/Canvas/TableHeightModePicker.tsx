import { useState } from 'react'
import type { TableHeightMode } from '@template-goblin/types'
import { TableHeightHelpModal } from './TableHeightHelpModal.js'

export interface TableHeightModePickerProps {
  sourceMode: 'static' | 'dynamic'
  selected: TableHeightMode | null
  onChange: (mode: TableHeightMode) => void
}

interface OptionConfig {
  id: TableHeightMode
  title: string
  description: string
  disabledForStatic?: boolean
}

const OPTIONS: OptionConfig[] = [
  {
    id: 'fixed',
    title: 'Fixed Height',
    description: 'Table stays strictly within drawn boundary; extra rows are clipped.',
  },
  {
    id: 'single_page_dynamic',
    title: 'Single Page (Dynamic Height)',
    description:
      'Table and page expand vertically to fit all rows on one page, pushing content below down.',
    disabledForStatic: true,
  },
  {
    id: 'multipage',
    title: 'Multi-Page (Dynamic)',
    description:
      'Table splits and flows across continuation pages when rows exceed the boundary (e.g. bank statements).',
    disabledForStatic: true,
  },
]

/**
 * Picker for Table height and overflow mode shown in FieldCreationPopup and RightPanel.
 */
export function TableHeightModePicker({
  sourceMode,
  selected,
  onChange,
}: TableHeightModePickerProps) {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="tg-field-row" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="tg-field-label" style={{ margin: 0, fontWeight: 600 }}>
          Height Mode
        </span>
        <button
          type="button"
          className="tg-btn tg-btn--icon"
          onClick={() => setShowHelp(true)}
          title="Compare Table Height Modes"
          data-testid="table-height-mode-help-btn"
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            fontSize: 12,
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          ?
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {OPTIONS.map((opt) => {
          const isDisabled = sourceMode === 'static' && opt.disabledForStatic
          const isSelected = selected === opt.id

          return (
            <label
              key={opt.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 6,
                border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                background: isSelected
                  ? 'color-mix(in srgb, var(--primary) 8%, transparent)'
                  : 'var(--bg-elevated)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
              }}
              data-testid={`table-height-option-${opt.id}`}
            >
              <input
                type="radio"
                name="tableHeightMode"
                value={opt.id}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => onChange(opt.id)}
                style={{ marginTop: 3 }}
                data-testid={`table-height-radio-${opt.id}`}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'var(--primary)' : 'var(--text)',
                  }}
                >
                  {opt.title}
                  {isDisabled && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 400,
                        color: 'var(--text-muted)',
                        marginLeft: 6,
                      }}
                    >
                      (Dynamic sources only)
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  {opt.description}
                </span>
              </div>
            </label>
          )
        })}
      </div>

      {showHelp && <TableHeightHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
