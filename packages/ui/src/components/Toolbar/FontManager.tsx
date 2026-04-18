import { useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'

export function FontManager() {
  const inputRef = useRef<HTMLInputElement>(null)
  const fonts = useTemplateStore((s) => s.fonts)
  const fields = useTemplateStore((s) => s.fields)
  const addFont = useTemplateStore((s) => s.addFont)
  const removeFont = useTemplateStore((s) => s.removeFont)
  const setShowFontManager = useUiStore((s) => s.setShowFontManager)

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.name.toLowerCase().endsWith('.ttf')) return

    // Size limit: 10 MB
    if (file.size > 10 * 1024 * 1024) {
      alert('Font file too large. Maximum size is 10 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer

      // Validate TTF magic bytes
      if (buffer.byteLength >= 4) {
        const view = new DataView(buffer)
        const magic = view.getUint32(0)
        if (magic !== 0x00010000 && magic !== 0x74727565 && magic !== 0x4f54544f) {
          alert('Invalid font file. Please select a valid .ttf file.')
          return
        }
      }

      const id = `font-${Date.now()}`
      // Sanitize filename
      const safeName = file.name.replace(/[/\\:*?"<>|]/g, '_').replace(/\.\./g, '_')
      const name = safeName.replace(/\.ttf$/i, '')
      addFont({ id, name, filename: `fonts/${safeName}` }, buffer)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function handleRemove(fontId: string) {
    const usedByFields = fields.filter((f) => {
      if (f.type === 'text') {
        const style = f.style as { fontId?: string | null }
        return style.fontId === fontId
      }
      return false
    })

    if (usedByFields.length > 0) {
      const names = usedByFields
        .map((f) => {
          if (f.source.mode === 'dynamic') return f.source.jsonKey || f.id
          return `<static ${f.type}> (${f.id})`
        })
        .join(', ')
      if (!window.confirm(`This font is used by fields: ${names}. Remove anyway?`)) {
        return
      }
    }

    removeFont(fontId)
  }

  return (
    <div className="tg-dialog-overlay" onClick={() => setShowFontManager(false)}>
      <div className="tg-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="tg-dialog-title">Font Manager</div>

        <div style={{ marginBottom: 12 }}>
          <button className="tg-btn tg-btn--primary" onClick={() => inputRef.current?.click()}>
            Upload .ttf Font
          </button>
          <input ref={inputRef} type="file" accept=".ttf" hidden onChange={handleUpload} />
        </div>

        {fonts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            No custom fonts uploaded. System fonts (Helvetica, Times-Roman, Courier) are always
            available.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fonts.map((font) => (
              <div
                key={font.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{font.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{font.filename}</div>
                </div>
                <button className="tg-btn tg-btn--danger" onClick={() => handleRemove(font.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="tg-dialog-actions">
          <button className="tg-btn" onClick={() => setShowFontManager(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
