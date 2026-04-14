import { useState } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import type { PageSize } from '@template-goblin/types'

interface PageSizeOption {
  label: string
  pageSize: PageSize
  width: number
  height: number
}

export function PageSizeDialog() {
  const showDialog = useUiStore((s) => s.showPageSizeDialog)
  const pendingBackground = useUiStore((s) => s.pendingBackground)
  const setShowPageSizeDialog = useUiStore((s) => s.setShowPageSizeDialog)
  const setPendingBackground = useUiStore((s) => s.setPendingBackground)
  const setPageSize = useTemplateStore((s) => s.setPageSize)
  const setBackground = useTemplateStore((s) => s.setBackground)

  const [selected, setSelected] = useState<string>('match')
  const [customWidth, setCustomWidth] = useState(595)
  const [customHeight, setCustomHeight] = useState(842)

  if (!showDialog || !pendingBackground) return null

  const { width: imgWidth, height: imgHeight, dataUrl, buffer } = pendingBackground
  const matchWidth = imgWidth
  const matchHeight = imgHeight

  const presetOptions: PageSizeOption[] = [
    { label: 'A4 (595 x 842 pt)', pageSize: 'A4', width: 595, height: 842 },
    { label: 'A3 (842 x 1191 pt)', pageSize: 'A3', width: 842, height: 1191 },
    { label: 'US Letter (612 x 792 pt)', pageSize: 'Letter', width: 612, height: 792 },
    { label: 'US Legal (612 x 1008 pt)', pageSize: 'Legal', width: 612, height: 1008 },
  ]

  function handleApply() {
    let chosenPageSize: PageSize
    let chosenWidth: number
    let chosenHeight: number

    if (selected === 'custom') {
      chosenPageSize = 'custom'
      chosenWidth = customWidth
      chosenHeight = customHeight
    } else if (selected === 'match') {
      chosenPageSize = 'custom'
      chosenWidth = matchWidth
      chosenHeight = matchHeight
    } else {
      const opt = presetOptions.find((o) => o.pageSize === selected)
      if (opt) {
        chosenPageSize = opt.pageSize
        chosenWidth = opt.width
        chosenHeight = opt.height
      } else {
        return
      }
    }

    setPageSize(chosenPageSize, chosenWidth, chosenHeight)
    setBackground(dataUrl, buffer)
    setShowPageSizeDialog(false)
    setPendingBackground(null)
  }

  function handleCancel() {
    setShowPageSizeDialog(false)
    setPendingBackground(null)
  }

  return (
    <div className="tg-dialog-overlay" onClick={handleCancel}>
      <div className="tg-dialog" onClick={(e) => e.stopPropagation()} style={{ minWidth: 420 }}>
        <h2 className="tg-dialog-title">Select Page Size</h2>
        <p style={{ marginBottom: 16 }}>
          Your image is{' '}
          <strong>
            {imgWidth} x {imgHeight}
          </strong>{' '}
          pixels
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          <RadioOption
            checked={selected === 'match'}
            onChange={() => setSelected('match')}
            label={`Match image (${matchWidth} x ${matchHeight} pt)`}
          />
          {presetOptions.map((opt) => (
            <RadioOption
              key={opt.pageSize}
              checked={selected === opt.pageSize}
              onChange={() => setSelected(opt.pageSize)}
              label={opt.label}
            />
          ))}
          <RadioOption
            checked={selected === 'custom'}
            onChange={() => setSelected('custom')}
            label="Custom"
          />
        </div>

        {selected === 'custom' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                Width (pt)
              </label>
              <input
                className="tg-input"
                type="number"
                min={1}
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                Height (pt)
              </label>
              <input
                className="tg-input"
                type="number"
                min={1}
                value={customHeight}
                onChange={(e) => setCustomHeight(Number(e.target.value))}
              />
            </div>
          </div>
        )}

        <div className="tg-dialog-actions">
          <button className="tg-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button className="tg-btn tg-btn--primary" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

function RadioOption({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        color: 'var(--text-primary)',
        background: checked ? 'var(--bg-tertiary)' : 'transparent',
        border: checked ? '1px solid var(--accent)' : '1px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        style={{
          width: 18,
          height: 18,
          accentColor: 'var(--accent)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </label>
  )
}
