import { useState } from 'react'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import type { PickedImage } from './FieldCreationPopup.js'

export interface StaticImagePickerProps {
  pickedImage: PickedImage | null
  pickedColor: string | null
  onPickFile: (file: File) => Promise<void>
  onPickSolidColor: (hex: string) => void
  onClear: () => void
}

/**
 * Image content picker for static image fields in creation popup.
 */
export function StaticImagePicker({
  pickedImage,
  pickedColor,
  onPickFile,
  onPickSolidColor,
  onClear,
}: StaticImagePickerProps) {
  const [imagePickMode, setImagePickMode] = useState<'choose' | 'color'>('choose')
  const [imageColor, setImageColor] = useState('#ffffff')

  if (pickedColor) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 48,
            height: 48,
            background: pickedColor,
            border: '1px solid var(--border)',
            borderRadius: 4,
          }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{pickedColor}</span>
        <button
          type="button"
          className="tg-btn"
          onClick={() => {
            onClear()
            setImagePickMode('choose')
          }}
          data-testid="create-popup-color-clear"
        >
          Change
        </button>
      </div>
    )
  }

  if (pickedImage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src={pickedImage.dataUrl}
          alt="preview"
          style={{
            width: 48,
            height: 48,
            objectFit: 'contain',
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: '#fff',
          }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{pickedImage.filename}</span>
        <button
          type="button"
          className="tg-btn"
          onClick={() => {
            onClear()
            setImagePickMode('choose')
          }}
          data-testid="create-popup-image-clear"
        >
          Change
        </button>
      </div>
    )
  }

  if (imagePickMode === 'choose') {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <label className="tg-btn tg-btn--primary" data-testid="create-popup-upload-image">
          Upload image
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onPickFile(f)
            }}
          />
        </label>
        <button
          type="button"
          className="tg-btn"
          onClick={() => setImagePickMode('color')}
          data-testid="create-popup-solid-color"
        >
          Solid color
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <ColorPickerPopover
        value={imageColor}
        onChange={setImageColor}
        swatchWidth={44}
        swatchHeight={32}
        ariaLabel="Image color"
      />
      <input
        type="text"
        className="tg-input"
        value={imageColor}
        onChange={(e) => setImageColor(e.target.value)}
        maxLength={7}
        style={{ width: 100, fontFamily: 'monospace' }}
        data-testid="create-popup-image-color-hex"
      />
      <button type="button" className="tg-btn" onClick={() => setImagePickMode('choose')}>
        Back
      </button>
      <button
        type="button"
        className="tg-btn tg-btn--primary"
        onClick={() => {
          const hex = /^#[0-9a-fA-F]{6}$/.test(imageColor) ? imageColor.toLowerCase() : '#ffffff'
          onPickSolidColor(hex)
        }}
        data-testid="create-popup-image-color-apply"
      >
        Apply color
      </button>
    </div>
  )
}
