import React, { useState, useRef } from 'react'
import type { PageBackgroundType } from '@template-goblin/types'

/** Inline dialog for adding a new page */
export function AddPageDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (bgType: PageBackgroundType, bgColor?: string, bgFile?: File) => void
}) {
  const [mode, setMode] = useState<'choose' | 'color'>('choose')
  const [color, setColor] = useState('#ffffff')
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="tg-dialog-overlay" onClick={onClose}>
      <div className="tg-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="tg-dialog-title">Add New Page</h3>
        <p>Choose a background for the new page:</p>

        {mode === 'choose' && (
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
                if (file) onAdd('image', undefined, file)
                e.target.value = ''
              }}
            />

            <button
              className="tg-btn"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              onClick={() => onAdd('inherit')}
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
              onClick={() => setMode('color')}
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
        )}

        {mode === 'color' && (
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
              <button className="tg-btn" onClick={() => setMode('choose')}>
                Back
              </button>
              <button className="tg-btn tg-btn--primary" onClick={() => onAdd('color', color)}>
                Add Page
              </button>
            </div>
          </div>
        )}

        {mode === 'choose' && (
          <div className="tg-dialog-actions">
            <button className="tg-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
