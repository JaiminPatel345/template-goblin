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

  // At 72 DPI, pixels = pt
  const matchWidth = imgWidth
  const matchHeight = imgHeight

  const matchLabel = `Match image (${matchWidth} x ${matchHeight} pt)`

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
      <div className="tg-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="tg-dialog-title">Select Page Size</h2>

        <p>
          Your image is {imgWidth}x{imgHeight} pixels
        </p>

        <div className="tg-page-size-options">
          {/* Match image */}
          <label className="tg-form-row">
            <input
              type="radio"
              name="pageSize"
              value="match"
              checked={selected === 'match'}
              onChange={() => setSelected('match')}
            />
            {matchLabel}
          </label>

          {/* Preset sizes */}
          {presetOptions.map((opt) => (
            <label key={opt.pageSize} className="tg-form-row">
              <input
                type="radio"
                name="pageSize"
                value={opt.pageSize}
                checked={selected === opt.pageSize}
                onChange={() => setSelected(opt.pageSize)}
              />
              {opt.label}
            </label>
          ))}

          {/* Custom */}
          <label className="tg-form-row">
            <input
              type="radio"
              name="pageSize"
              value="custom"
              checked={selected === 'custom'}
              onChange={() => setSelected('custom')}
            />
            Custom
          </label>

          {selected === 'custom' && (
            <div className="tg-form-row tg-custom-size-inputs">
              <label>
                Width (pt):
                <input
                  className="tg-input"
                  type="number"
                  min={1}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                />
              </label>
              <label>
                Height (pt):
                <input
                  className="tg-input"
                  type="number"
                  min={1}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                />
              </label>
            </div>
          )}
        </div>

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
