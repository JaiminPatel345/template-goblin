/**
 * Single-row upload control inside `PreviewDialog` (#45). Shows the
 * placeholder thumbnail (or a "no img" tile if the bitmap hasn't loaded),
 * the field's `jsonKey`, and an Upload button bound to a hidden file
 * picker.
 *
 * Extracted from `PreviewDialog.tsx` to keep that file under the 300-line
 * cap (Hard Rule #11).
 */
import { useRef } from 'react'

export function PreviewImageUploadRow({
  jsonKey,
  thumbnail,
  isOverride,
  onUpload,
}: {
  jsonKey: string
  thumbnail: string | null
  isOverride: boolean
  onUpload: (f: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 8,
        border: '1px solid var(--border, #ddd)',
        borderRadius: 4,
      }}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          style={{
            width: 48,
            height: 48,
            objectFit: 'contain',
            background: '#f5f5f5',
            borderRadius: 2,
          }}
        />
      ) : (
        <div
          style={{
            width: 48,
            height: 48,
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: 'var(--text-muted, #888)',
            borderRadius: 2,
          }}
        >
          no img
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {jsonKey}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>
          {isOverride ? 'Uploaded' : 'Using placeholder'}
        </div>
      </div>
      <button
        className="tg-btn"
        onClick={() => inputRef.current?.click()}
        data-testid={`preview-upload-${jsonKey}`}
      >
        Upload
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
