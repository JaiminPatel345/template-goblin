import React, { useState, useRef } from 'react'
import { type PageBackgroundType, type PageSize } from '@template-goblin/types'
import {
  PageSizePicker,
  resolveChoice,
  validateCustomDims,
  type PageSizeChoice,
} from './PageSizePicker.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'

/**
 * Two-step "Add page" dialog.
 *  Step 1 — pick background type (image upload, inherit from previous, solid color).
 *  Step 2 — pick page size (Same as previous, A4/A3/A5/Letter/Legal, Custom).
 *
 * `onAdd` fires only after both steps complete with a final size payload so
 * callers don't have to reconcile partial state. `previousSize` is the
 * resolved size of the page the new one is being inserted after — drives the
 * "Same as previous" default.
 */
export interface AddPageSize {
  pageSize: PageSize
  width: number
  height: number
}

export function AddPageDialog({
  onClose,
  onAdd,
  previousSize,
  mode = 'add',
}: {
  onClose: () => void
  onAdd: (bgType: PageBackgroundType, size: AddPageSize, bgColor?: string, bgFile?: File) => void
  previousSize: { width: number; height: number }
  /**
   * `'add'` (default) — the dialog adds a brand-new page after the current
   * sheet; the title reads "Add New Page" and the action button reads
   * "Add Page".
   * `'edit'` — the dialog changes the *current* page's background; the
   * title reads "Change Background" and the action button reads "Apply".
   * `inherit` in this mode means "match the previous page's background"
   * — the same semantics it has in add mode.
   */
  mode?: 'add' | 'edit'
}) {
  type Step1 =
    | { kind: 'image'; bgFile: File }
    | { kind: 'inherit' }
    | { kind: 'color'; color: string }

  const [step, setStep] = useState<'choose' | 'color' | 'size'>('choose')
  const [color, setColor] = useState('#ffffff')
  const [bgPick, setBgPick] = useState<Step1 | null>(null)

  // Step-2 state — default to "match previous" since most sheets in a
  // multi-page doc keep the same paper size. Image uploads override this
  // to "match" (the uploaded image's natural dimensions) below.
  const [sizeChoice, setSizeChoice] = useState<PageSizeChoice>('previous')
  const [customWidth, setCustomWidth] = useState(previousSize.width)
  const [customHeight, setCustomHeight] = useState(previousSize.height)
  // Decoded natural dimensions of the user's uploaded image — drives the
  // "Match image" radio in the size picker.
  const [imageNatural, setImageNatural] = useState<{ width: number; height: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function gotoSize(pick: Step1) {
    setBgPick(pick)
    setStep('size')
  }

  /**
   * Decode the uploaded image's natural dimensions in a hidden HTMLImageElement
   * before transitioning to the size step. We default `sizeChoice` to
   * 'match' AND pre-fill the custom width/height with those numbers so the
   * picker opens with the natural size selected and a sensible fallback if
   * the user switches to Custom.
   */
  function pickImage(file: File) {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const natural = { width: img.naturalWidth, height: img.naturalHeight }
      setImageNatural(natural)
      setCustomWidth(natural.width)
      setCustomHeight(natural.height)
      setSizeChoice('match')
      setBgPick({ kind: 'image', bgFile: file })
      setStep('size')
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      // Fallback: skip the natural-size pre-fill and let the user pick a
      // preset like every other flow.
      URL.revokeObjectURL(url)
      setImageNatural(null)
      setSizeChoice('previous')
      setBgPick({ kind: 'image', bgFile: file })
      setStep('size')
    }
    img.src = url
  }

  function commit() {
    if (!bgPick) return
    const size = resolveChoice(
      sizeChoice,
      customWidth,
      customHeight,
      previousSize,
      imageNatural ?? undefined,
    )
    if (bgPick.kind === 'image') onAdd('image', size, undefined, bgPick.bgFile)
    else if (bgPick.kind === 'inherit') onAdd('inherit', size)
    else onAdd('color', size, bgPick.color)
  }

  return (
    <div className="tg-dialog-overlay" onClick={onClose}>
      <div
        className="tg-dialog"
        onClick={(e) => e.stopPropagation()}
        // Lock the dialog width so picking "Custom" inside the size picker
        // (which adds a two-input row) doesn't widen the modal and shift
        // every other label sideways. Min-height absorbs the height delta
        // between the choose / color / size steps for the same reason.
        style={{ minWidth: 360, minHeight: 320 }}
      >
        <h3 className="tg-dialog-title">
          {mode === 'edit' ? 'Change Background' : 'Add New Page'}
        </h3>

        {step === 'choose' && (
          <>
            <p>Choose a background for the new page:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="tg-btn"
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Upload new image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) pickImage(file)
                  e.target.value = ''
                }}
              />

              <button
                className="tg-btn"
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
                onClick={() =>
                  // Inherit means "same as previous page" — including
                  // dimensions. Skip the size dialog entirely (#47).
                  onAdd('inherit', {
                    pageSize: 'custom',
                    width: previousSize.width,
                    height: previousSize.height,
                  })
                }
                data-testid="add-page-inherit"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                  <path d="M7 12h10M12 7v10" />
                </svg>
                Same as previous page
              </button>

              <button
                className="tg-btn"
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
                onClick={() => setStep('color')}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
                Solid color
              </button>
            </div>
            <div className="tg-dialog-actions">
              <button className="tg-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 'color' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Color:</label>
              <ColorPickerPopover
                value={color}
                onChange={setColor}
                swatchWidth={48}
                swatchHeight={32}
                ariaLabel="Page background color"
              />
              <span
                style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}
              >
                {color}
              </span>
            </div>
            <div className="tg-dialog-actions">
              <button className="tg-btn" onClick={() => setStep('choose')}>
                Back
              </button>
              <button
                className="tg-btn tg-btn--primary"
                onClick={() => gotoSize({ kind: 'color', color })}
              >
                {/* GH #114 — same shortening as OnboardingPicker. */}
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 'size' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ marginBottom: 8 }}>Page size:</p>
            <PageSizePicker
              value={sizeChoice}
              onChange={setSizeChoice}
              previousSize={previousSize}
              previousSizeLabel={mode === 'edit' ? 'Same as Current' : 'Same as previous'}
              matchImage={imageNatural ?? undefined}
              customWidth={customWidth}
              customHeight={customHeight}
              setCustomWidth={setCustomWidth}
              setCustomHeight={setCustomHeight}
            />
            <div className="tg-dialog-actions" style={{ marginTop: 12 }}>
              <button
                className="tg-btn"
                onClick={() => {
                  // From the colour-pick branch the user expects Back to
                  // return to the swatch. From image/inherit there's no
                  // intermediate step — go straight to the type picker.
                  if (bgPick?.kind === 'color') setStep('color')
                  else setStep('choose')
                }}
              >
                Back
              </button>
              <button
                className="tg-btn tg-btn--primary"
                onClick={commit}
                data-testid="add-page-confirm"
                disabled={
                  sizeChoice === 'custom' && validateCustomDims(customWidth, customHeight).hasError
                }
              >
                {mode === 'edit' ? 'Apply' : 'Add Page'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
