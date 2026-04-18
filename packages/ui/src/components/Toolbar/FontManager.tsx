import { useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { processFontFiles } from './fontUpload.js'

export function FontManager() {
  const inputRef = useRef<HTMLInputElement>(null)
  const fonts = useTemplateStore((s) => s.fonts)
  const fields = useTemplateStore((s) => s.fields)
  const removeFont = useTemplateStore((s) => s.removeFont)
  const setShowFontManager = useUiStore((s) => s.setShowFontManager)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const results = await processFontFiles(files)
    // Surface meaningful failures to the user. Extension rejections are
    // silent because the `accept=".ttf"` attribute already filters the
    // picker; magic-byte / size / duplicate failures are worth flagging.
    for (const r of results) {
      if (r.ok) continue
      if (r.reason === 'size') {
        alert(`Font file too large: ${r.filename}. Maximum size is 10 MB.`)
      } else if (r.reason === 'magic') {
        alert(`Invalid font file: ${r.filename}. Please select a valid .ttf file.`)
      }
    }
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
          if (!f.source) return `<legacy ${f.type}> (${f.id})`
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
          <input ref={inputRef} type="file" accept=".ttf" multiple hidden onChange={handleUpload} />
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
