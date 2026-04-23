import React, { useState } from 'react'

/**
 * Empty-state onboarding picker. Shown on page 0 when no background has been
 * chosen yet. Offers two options:
 *   - Upload image: reuses the existing upload flow (PageSizeDialog follows).
 *   - Solid color: HTML `<input type="color">` + hex input, applied to page 0
 *     as `backgroundType: 'color'` with the chosen `#RRGGBB`.
 * Defaults to `#FFFFFF` if the user hits Apply without touching the picker.
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
  onChooseColor: (hex: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  setContainerRef: (el: HTMLDivElement | null) => void
}) {
  const [mode, setMode] = useState<'choose' | 'color'>('choose')
  const [color, setColor] = useState('#ffffff')

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
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
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
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 56, height: 40, border: 'none', cursor: 'pointer' }}
                data-testid="onboarding-color-input"
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
                onClick={() => {
                  // Normalise: default to white if the user cleared the input,
                  // and lowercase the hex for consistency.
                  const hex = /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : '#ffffff'
                  onChooseColor(hex)
                }}
                data-testid="onboarding-color-apply"
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
