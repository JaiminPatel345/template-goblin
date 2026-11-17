import { useState } from 'react'
import type { ReactNode } from 'react'
import type { TableHeightMode } from '@template-goblin/types'
import { TableHeightHelpModal } from './TableHeightHelpModal.js'
import {
  FixedHeightIcon,
  SinglePageDynamicIcon,
  MultiPageDynamicIcon,
  TableHeightHelpIcon,
} from './tableHeightIcons.js'

export interface TableHeightModePickerProps {
  sourceMode: 'static' | 'dynamic'
  selected: TableHeightMode | null
  onChange: (mode: TableHeightMode) => void
}

interface OptionConfig {
  id: TableHeightMode
  title: string
  badge: string
  description: string
  disabledForStatic?: boolean
  icon: ReactNode
}

const OPTIONS: OptionConfig[] = [
  {
    id: 'fixed',
    title: 'Fixed Height',
    badge: 'Clipped',
    description: 'Table stays strictly within drawn boundary; extra rows are clipped.',
    icon: <FixedHeightIcon />,
  },
  {
    id: 'single_page_dynamic',
    title: 'Single Page Dynamic',
    badge: 'Auto-expands',
    description:
      'Table and page expand vertically to fit all rows on one page, pushing content below down.',
    disabledForStatic: true,
    icon: <SinglePageDynamicIcon />,
  },
  {
    id: 'multipage',
    title: 'Multi-Page Dynamic',
    badge: 'Continuation',
    description:
      'Table splits and flows across continuation pages when rows exceed boundary (e.g. statements).',
    disabledForStatic: true,
    icon: <MultiPageDynamicIcon />,
  },
]

/**
 * Picker for Table height and overflow mode shown in FieldCreationPopup and RightPanel.
 * Supports light and dark modes with theme-adapted high-contrast selection styling.
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
        <span
          className="tg-field-label"
          style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}
        >
          Height Mode
        </span>
        <button
          type="button"
          className="tg-btn"
          onClick={() => setShowHelp(true)}
          title="Compare Table Height Modes"
          data-testid="table-height-mode-help-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 22,
            padding: '0 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-xs)',
            transition: 'all 0.15s ease',
          }}
        >
          <TableHeightHelpIcon />
          <span>Compare</span>
        </button>
      </div>

      <div
        className="tg-table-mode-picker-group"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: 6,
          borderRadius: 8,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        {OPTIONS.map((opt) => {
          const isDisabled = sourceMode === 'static' && opt.disabledForStatic
          const isSelected = selected === opt.id

          return (
            <label
              key={opt.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '8px 10px',
                borderRadius: 6,
                border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: isSelected ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.45 : 1,
                boxShadow: isSelected ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'var(--shadow-xs)',
                transition: 'all 0.15s ease',
              }}
              data-testid={`table-height-option-${opt.id}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border-strong)'}`,
                    background: isSelected ? 'var(--accent)' : 'var(--bg-elevated)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSelected && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ffffff',
                      }}
                    />
                  )}
                </span>

                <input
                  type="radio"
                  name="tableHeightMode"
                  value={opt.id}
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => onChange(opt.id)}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  data-testid={`table-height-radio-${opt.id}`}
                />

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {opt.icon}
                </span>

                <span
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-primary)',
                    flexGrow: 1,
                  }}
                >
                  {opt.title}
                </span>

                {isDisabled ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '1px 5px',
                      borderRadius: 3,
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Dynamic only
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isSelected ? 600 : 500,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: isSelected ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: isSelected ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {opt.badge}
                  </span>
                )}
              </div>

              <span
                style={{
                  fontSize: 11,
                  color: isSelected ? 'var(--text-secondary)' : 'var(--text-muted)',
                  lineHeight: 1.35,
                  paddingLeft: 24,
                }}
              >
                {opt.description}
              </span>
            </label>
          )
        })}
      </div>

      {showHelp && <TableHeightHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
