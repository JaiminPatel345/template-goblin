import { useState, useEffect } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import type { PageSize } from '@template-goblin/types'
import { getPageSize } from '@template-goblin/types'
import {
  PageSizePicker,
  resolveChoice,
  validateCustomDims,
  type PageSizeChoice,
} from '../Canvas/PageSizePicker.js'

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

  const [sizeChoice, setSizeChoice] = useState<PageSizeChoice>('custom')
  const [customWidth, setCustomWidth] = useState<number | ''>(currentDims.width)
  const [customHeight, setCustomHeight] = useState<number | ''>(currentDims.height)

  useEffect(() => {
    if (target === 'resizePage') {
      const initialDims = getPageSize(currentPageDef, meta)
      setCustomWidth(initialDims.width)
      setCustomHeight(initialDims.height)
      setSizeChoice('custom')
    }
  }, [target, currentPageId, currentPageDef, meta])

  if (target !== 'resizePage') return null

  const { hasError } = validateCustomDims(customWidth, customHeight)
  const applyDisabled = sizeChoice === 'custom' && hasError

  function handleApply() {
    const resolved = resolveChoice(sizeChoice, customWidth, customHeight)
    let chosenPageSize: PageSize = 'custom'
    if (sizeChoice === 'A4') chosenPageSize = 'A4'
    else if (sizeChoice === 'Letter') chosenPageSize = 'Letter'

    if (currentPageDef) {
      updatePage(currentPageDef.id, {
        pageSize: chosenPageSize,
        width: resolved.width,
        height: resolved.height,
      })
      if (currentPageDef.index === 0) {
        setPageSize(chosenPageSize, resolved.width, resolved.height)
      }
    } else {
      setPageSize(chosenPageSize, resolved.width, resolved.height)
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
        style={{ minWidth: 360 }}
        data-testid="resize-page-modal"
      >
        <h3 className="tg-dialog-title">Resize Page</h3>

        <PageSizePicker
          value={sizeChoice}
          onChange={setSizeChoice}
          customWidth={customWidth}
          customHeight={customHeight}
          setCustomWidth={setCustomWidth}
          setCustomHeight={setCustomHeight}
        />

        <div className="tg-dialog-actions" style={{ marginTop: 16 }}>
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
