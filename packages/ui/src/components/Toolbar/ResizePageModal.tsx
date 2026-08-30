import { useState, useEffect } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import type { PageSize } from '@template-goblin/types'
import { getPageSize } from '@template-goblin/types'
import { validateCustomDims, presetMatchLabel } from '../Canvas/PageSizePicker.js'
import { OrientationToggle, swapDimensions } from '../Canvas/OrientationToggle.js'

interface PresetOption {
  label: string
  pageSize: PageSize
  width: number
  height: number
}

const PRESET_OPTIONS: PresetOption[] = [
  { label: 'A4 (595 x 842 pt)', pageSize: 'A4', width: 595, height: 842 },
  { label: 'A3 (842 x 1191 pt)', pageSize: 'A3', width: 842, height: 1191 },
  { label: 'A5 (420 x 595 pt)', pageSize: 'A5', width: 420, height: 595 },
  { label: 'Letter (612 x 792 pt)', pageSize: 'Letter', width: 612, height: 792 },
  { label: 'Legal (612 x 1008 pt)', pageSize: 'Legal', width: 612, height: 1008 },
]

export function ResizePageModal() {
  const target = useUiStore((s) => s.pageLayoutSettings)
  const setSettings = useUiStore((s) => s.setPageLayoutSettings)
  const currentPageId = useUiStore((s) => s.currentPageId)

  const pages = useTemplateStore((s) => s.pages)
  const meta = useTemplateStore((s) => s.meta)
  const setPageSize = useTemplateStore((s) => s.setPageSize)
  const updatePage = useTemplateStore((s) => s.updatePage)

  const currentPageDef =
    pages.find((p) => p.id === currentPageId) ?? pages.find((p) => p.index === 0)
  const currentDims = getPageSize(currentPageDef, meta)

  const [selected, setSelected] = useState<string>('custom')
  const [customWidth, setCustomWidth] = useState<number | ''>(currentDims.width)
  const [customHeight, setCustomHeight] = useState<number | ''>(currentDims.height)

  useEffect(() => {
    if (target === 'resizePage') {
      const initialDims = getPageSize(currentPageDef, meta)
      setCustomWidth(initialDims.width)
      setCustomHeight(initialDims.height)
      const matchingPreset = PRESET_OPTIONS.find(
        (p) => p.width === initialDims.width && p.height === initialDims.height,
      )
      setSelected(matchingPreset ? matchingPreset.pageSize : 'custom')
    }
  }, [target, currentPageId, currentPageDef, meta])

  if (target !== 'resizePage') return null

  const customDimValidation = validateCustomDims(customWidth, customHeight)
  const applyDisabled = selected === 'custom' && customDimValidation.hasError
  const customMatch = presetMatchLabel(customWidth, customHeight)

  const effectiveDims =
    selected === 'custom'
      ? { width: Number(customWidth) || 0, height: Number(customHeight) || 0 }
      : (PRESET_OPTIONS.find((o) => o.pageSize === selected) ?? {
          width: Number(customWidth) || 0,
          height: Number(customHeight) || 0,
        })

  const handleSwapOrientation = () => {
    const swapped = swapDimensions(effectiveDims.width, effectiveDims.height)
    setCustomWidth(swapped.width)
    setCustomHeight(swapped.height)
    setSelected('custom')
  }

  function handleApply() {
    let chosenPageSize: PageSize
    let chosenWidth: number
    let chosenHeight: number

    if (selected === 'custom') {
      if (customDimValidation.hasError) return
      chosenPageSize = 'custom'
      chosenWidth = Number(customWidth)
      chosenHeight = Number(customHeight)
    } else {
      const opt = PRESET_OPTIONS.find((o) => o.pageSize === selected)
      if (opt) {
        chosenPageSize = opt.pageSize
        chosenWidth = opt.width
        chosenHeight = opt.height
      } else {
        return
      }
    }

    if (currentPageDef) {
      updatePage(currentPageDef.id, {
        pageSize: chosenPageSize,
        width: chosenWidth,
        height: chosenHeight,
      })
      if (currentPageDef.index === 0) {
        setPageSize(chosenPageSize, chosenWidth, chosenHeight)
      }
    } else {
      setPageSize(chosenPageSize, chosenWidth, chosenHeight)
    }

    setSettings(null)
  }

  function handleCancel() {
    setSettings(null)
  }

  return (
    <div
      className="tg-dialog-overlay"
      onClick={handleCancel}
      data-testid="resize-page-modal-overlay"
    >
      <div
        className="tg-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 420 }}
        data-testid="resize-page-modal"
      >
        <h2 className="tg-dialog-title">Resize Page</h2>
        <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          Active page size:{' '}
          <strong>
            {currentDims.width} x {currentDims.height} pt
          </strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {PRESET_OPTIONS.map((opt) => (
            <label
              key={opt.pageSize}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <input
                type="radio"
                name="resize-page-preset"
                checked={selected === opt.pageSize}
                onChange={() => setSelected(opt.pageSize)}
                data-testid={`resize-preset-${opt.pageSize.toLowerCase()}`}
              />
              {opt.label}
            </label>
          ))}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            <input
              type="radio"
              name="resize-page-preset"
              checked={selected === 'custom'}
              onChange={() => setSelected('custom')}
              data-testid="resize-preset-custom"
            />
            Custom
          </label>
        </div>

        {selected === 'custom' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 16,
              padding: 12,
              background: 'var(--bg-secondary)',
              borderRadius: 6,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                Width (pt)
                <input
                  type="number"
                  className="tg-input"
                  style={{ width: 100 }}
                  value={customWidth}
                  min={1}
                  onChange={(e) => {
                    const val = e.target.value
                    setCustomWidth(val === '' ? '' : Number(val))
                  }}
                  data-testid="resize-page-width-input"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                Height (pt)
                <input
                  type="number"
                  className="tg-input"
                  style={{ width: 100 }}
                  value={customHeight}
                  min={1}
                  onChange={(e) => {
                    const val = e.target.value
                    setCustomHeight(val === '' ? '' : Number(val))
                  }}
                  data-testid="resize-page-height-input"
                />
              </label>

              <div style={{ marginTop: 18 }}>
                <OrientationToggle
                  width={effectiveDims.width}
                  height={effectiveDims.height}
                  onSwap={handleSwapOrientation}
                />
              </div>
            </div>

            {customDimValidation.hasError && (
              <p
                style={{ color: 'var(--accent-danger, #ef4444)', fontSize: 12, margin: 0 }}
                data-testid="resize-page-error"
              >
                {customDimValidation.widthError ?? customDimValidation.heightError}
              </p>
            )}

            {customMatch && !customDimValidation.hasError && (
              <p style={{ color: 'var(--text-primary)', fontSize: 12, margin: 0 }}>
                Same as {customMatch}
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            className="tg-btn"
            onClick={handleCancel}
            data-testid="resize-page-cancel-button"
          >
            Cancel
          </button>
          <button
            type="button"
            className="tg-btn tg-btn--primary"
            disabled={applyDisabled}
            onClick={handleApply}
            data-testid="resize-page-apply-button"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
