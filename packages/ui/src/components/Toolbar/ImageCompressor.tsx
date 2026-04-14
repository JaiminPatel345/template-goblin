import { useState, useEffect, useRef } from 'react'
import { useUiStore } from '../../store/uiStore.js'

interface CompressedResult {
  dataUrl: string
  buffer: ArrayBuffer
  size: number
}

/**
 * Advanced image compression dialog.
 * Shows side-by-side comparison of original vs compressed background image.
 * User can adjust compression quality with a slider.
 */
export function ImageCompressor() {
  const pendingBg = useUiStore((s) => s.pendingBackground)
  const setShowPageSizeDialog = useUiStore((s) => s.setShowPageSizeDialog)
  const setPendingBackground = useUiStore((s) => s.setPendingBackground)
  const [showCompressor, setShowCompressor] = useState(false)

  const [quality, setQuality] = useState(0.8)
  const [compressed, setCompressed] = useState<CompressedResult | null>(null)
  const [compressing, setCompressing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const originalSize = pendingBg?.buffer.byteLength ?? 0

  // Compress when quality changes
  useEffect(() => {
    if (!pendingBg || !showCompressor) return

    setCompressing(true)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0)

      canvas.toBlob(
        (blob) => {
          if (!blob) return
          const reader = new FileReader()
          reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer
            const dataUrl = URL.createObjectURL(blob)
            setCompressed({ dataUrl, buffer: arrayBuffer, size: blob.size })
            setCompressing(false)
          }
          reader.readAsArrayBuffer(blob)
        },
        'image/jpeg',
        quality,
      )
    }
    img.src = pendingBg.dataUrl
  }, [quality, pendingBg, showCompressor])

  function handleApplyCompressed() {
    if (!compressed || !pendingBg) return

    setPendingBackground({
      ...pendingBg,
      dataUrl: compressed.dataUrl,
      buffer: compressed.buffer,
    })
    setShowCompressor(false)
    setShowPageSizeDialog(true)
  }

  function handleSkip() {
    setShowCompressor(false)
    setShowPageSizeDialog(true)
  }

  // Expose trigger
  useEffect(() => {
    function handleTrigger() {
      if (useUiStore.getState().pendingBackground) {
        setShowCompressor(true)
      }
    }
    window.addEventListener('tg:show-compressor', handleTrigger)
    return () => window.removeEventListener('tg:show-compressor', handleTrigger)
  }, [])

  if (!showCompressor || !pendingBg) return null

  const savings = compressed ? ((1 - compressed.size / originalSize) * 100).toFixed(1) : '0'

  return (
    <div className="tg-dialog-overlay" onClick={handleSkip}>
      <div className="tg-dialog" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="tg-dialog-title">Image Compression</div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          {/* Original */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Original
            </div>
            <img
              src={pendingBg.dataUrl}
              alt="Original"
              style={{
                maxWidth: '100%',
                maxHeight: 200,
                border: '1px solid var(--border)',
                borderRadius: 4,
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {formatBytes(originalSize)}
            </div>
          </div>

          {/* Compressed */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Compressed
            </div>
            {compressed ? (
              <>
                <img
                  src={compressed.dataUrl}
                  alt="Compressed"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 200,
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
                  {formatBytes(compressed.size)} ({savings}% smaller)
                </div>
              </>
            ) : (
              <div
                style={{
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                {compressing ? 'Compressing...' : 'Adjust quality'}
              </div>
            )}
          </div>
        </div>

        {/* Quality slider */}
        <div className="tg-form-row" style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Quality</span>
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(quality * 100)}%</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="tg-dialog-actions">
          <button className="tg-btn" onClick={handleSkip}>
            Skip (Use Original)
          </button>
          <button
            className="tg-btn tg-btn--primary"
            onClick={handleApplyCompressed}
            disabled={!compressed}
          >
            Use Compressed
          </button>
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
