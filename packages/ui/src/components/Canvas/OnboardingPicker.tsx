import React, { useState } from 'react'
import { type PageSize } from '@template-goblin/types'
import {
  PageSizePicker,
  resolveChoice,
  validateCustomDims,
  type PageSizeChoice,
} from './PageSizePicker.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'

/**
 * Empty-state onboarding picker. Shown on page 0 when no background has been
 * chosen yet. Offers two options:
 *   - Upload image: reuses the existing upload flow (PageSizeDialog follows).
 *   - Solid color: HTML `<input type="color">` + hex input, then a page-size
 *     step (A4 / Letter / Legal / A3 / A5 / Custom) before stamping page 0.
 */
export function OnboardingPicker({
  isDragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onChooseImage,
  onChooseColor,
  fileInputRef,
  onFileChange,
  setContainerRef,
}: {
  isDragOver: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onChooseImage: () => void
  onChooseColor: (hex: string, size: { pageSize: PageSize; width: number; height: number }) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  setContainerRef: (el: HTMLDivElement | null) => void
}) {
  const [mode, setMode] = useState<'choose' | 'color' | 'size'>('choose')
  const [color, setColor] = useState('#ffffff')
  // Default to A4 since onboarding's first page has no "previous" to inherit.
  const [sizeChoice, setSizeChoice] = useState<PageSizeChoice>('A4')
  const [customWidth, setCustomWidth] = useState(595)
  const [customHeight, setCustomHeight] = useState(842)

  return (
    <div
      ref={setContainerRef}
      className={`tg-upload-zone ${isDragOver ? 'tg-upload-zone--active' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="tg-upload-content">
        {mode === 'choose' && (
          <>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <h2 className="tg-upload-title">Choose a background</h2>
            <p className="tg-upload-subtitle">Upload an image or start with a solid color.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <button
                className="tg-btn tg-btn--primary tg-upload-btn"
                onClick={onChooseImage}
                data-testid="onboarding-upload-image"
              >
                Upload image
              </button>
              <button
                className="tg-btn tg-upload-btn"
                onClick={() => setMode('color')}
                data-testid="onboarding-solid-color"
              >
                Solid color
              </button>
            </div>
            <input
              ref={(el) => {
                if (fileInputRef && typeof fileInputRef === 'object') {
                  ;(fileInputRef as { current: HTMLInputElement | null }).current = el
                }
              }}
              type="file"
              accept="image/*"
              hidden
              onChange={onFileChange}
            />
            <p className="tg-upload-hint">
              Drag and drop an image here too — supports PNG, JPG, WEBP.
            </p>
          </>
        )}

        {mode === 'color' && (
          <>
            {/*
             * GH #115 — the inner disc reflects the currently-selected color
             * so the user sees their choice update live as they pick from
             * the swatch or type a hex. We accept the hex only when it
             * matches `#RRGGBB` (the same gate the Apply handler uses);
             * partial typing falls back to the muted theme tint so the icon
             * doesn't flash arbitrary colors mid-keystroke.
             */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
              data-testid="onboarding-color-preview-icon"
            >
              <circle cx="12" cy="12" r="10" />
              <circle
                cx="12"
                cy="12"
                r="6"
                stroke="none"
                fill={/^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : 'var(--text-muted)'}
                data-testid="onboarding-color-preview-disc"
              />
            </svg>
            <h2 className="tg-upload-title">Pick a background color</h2>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              <ColorPickerPopover
                value={color}
                onChange={setColor}
                swatchWidth={56}
                swatchHeight={40}
                ariaLabel="Onboarding page color"
              />
              <input
                type="text"
                className="tg-input"
                value={color}
                onChange={(e) => {
                  const v = e.target.value
                  // Accept partial typing; validate & persist only on Apply.
                  setColor(v)
                }}
                style={{ width: 100, fontFamily: 'monospace' }}
                maxLength={7}
                data-testid="onboarding-color-hex"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="tg-btn" onClick={() => setMode('choose')}>
                Back
              </button>
              <button
                className="tg-btn tg-btn--primary"
                onClick={() => setMode('size')}
                data-testid="onboarding-color-next"
              >
                {/*
                 * GH #114 — "Next: page size" overflowed the card on the
                 * default `max-w-md` width, clipping to "Next: page si...".
                 * The arrow keeps the call-to-action obvious; the next
                 * step's "Choose page size" heading carries the context.
                 */}
                Next →
              </button>
            </div>
          </>
        )}

        {mode === 'size' && (
          <>
            <h2 className="tg-upload-title">Choose page size</h2>
            <div style={{ maxWidth: 360, margin: '12px auto 0' }}>
              <PageSizePicker
                value={sizeChoice}
                onChange={setSizeChoice}
                customWidth={customWidth}
                customHeight={customHeight}
                setCustomWidth={setCustomWidth}
                setCustomHeight={setCustomHeight}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="tg-btn" onClick={() => setMode('color')}>
                Back
              </button>
              <button
                className="tg-btn tg-btn--primary"
                onClick={() => {
                  const hex = /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : '#ffffff'
                  const size = resolveChoice(sizeChoice, customWidth, customHeight)
                  onChooseColor(hex, size)
                }}
                data-testid="onboarding-color-apply"
                disabled={
                  sizeChoice === 'custom' && validateCustomDims(customWidth, customHeight).hasError
                }
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
