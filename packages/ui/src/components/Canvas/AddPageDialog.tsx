import React, { useState, useRef } from 'react'
import { type PageBackgroundType, type PageSize } from '@template-goblin/types'
import { PageSizePicker, resolveChoice, type PageSizeChoice } from './PageSizePicker.js'

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
}: {
  onClose: () => void
  onAdd: (bgType: PageBackgroundType, size: AddPageSize, bgColor?: string, bgFile?: File) => void
  previousSize: { width: number; height: number }
}) {
  type Step1 =
    | { kind: 'image'; bgFile: File }
    | { kind: 'inherit' }
    | { kind: 'color'; color: string }

  const [step, setStep] = useState<'choose' | 'color' | 'size'>('choose')
  const [color, setColor] = useState('#ffffff')
  const [bgPick, setBgPick] = useState<Step1 | null>(null)

  // Step-2 state — default to "match previous" since most sheets in a
  // multi-page doc keep the same paper size.
  const [sizeChoice, setSizeChoice] = useState<PageSizeChoice>('previous')
  const [customWidth, setCustomWidth] = useState(previousSize.width)
  const [customHeight, setCustomHeight] = useState(previousSize.height)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function gotoSize(pick: Step1) {
    setBgPick(pick)
    setStep('size')
  }

  function commit() {
    if (!bgPick) return
    const size = resolveChoice(sizeChoice, customWidth, customHeight, previousSize)
    if (bgPick.kind === 'image') onAdd('image', size, undefined, bgPick.bgFile)
    else if (bgPick.kind === 'inherit') onAdd('inherit', size)
    else onAdd('color', size, bgPick.color)
  }

  return (
    <div className="tg-dialog-overlay" onClick={onClose}>
      <div className="tg-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="tg-dialog-title">Add New Page</h3>

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
                  if (file) gotoSize({ kind: 'image', bgFile: file })
                  e.target.value = ''
                }}
              />

              <button
                className="tg-btn"
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
                onClick={() => gotoSize({ kind: 'inherit' })}
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
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: '48px', height: '32px', border: 'none', cursor: 'pointer' }}
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
                Next: page size
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
              <button className="tg-btn tg-btn--primary" onClick={commit}>
                Add Page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
