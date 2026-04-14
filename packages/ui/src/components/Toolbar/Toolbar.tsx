import { useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { saveTemplate, openTemplate } from '../../utils/saveOpen.js'

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  const meta = useTemplateStore((s) => s.meta)
  const locked = meta.locked
  const hasBackground = useTemplateStore((s) => s.backgroundDataUrl !== null)
  const canUndo = useTemplateStore((s) => s.canUndo())
  const canRedo = useTemplateStore((s) => s.canRedo())
  const undo = useTemplateStore((s) => s.undo)
  const redo = useTemplateStore((s) => s.redo)
  const setLocked = useTemplateStore((s) => s.setLocked)

  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const activeTool = useUiStore((s) => s.activeTool)
  const setActiveTool = useUiStore((s) => s.setActiveTool)
  const showGrid = useUiStore((s) => s.showGrid)
  const setShowGrid = useUiStore((s) => s.setShowGrid)
  const showPreview = useUiStore((s) => s.showPreview)
  const setShowPreview = useUiStore((s) => s.setShowPreview)
  const setShowFontManager = useUiStore((s) => s.setShowFontManager)
  const zoom = useUiStore((s) => s.zoom)
  const zoomIn = useUiStore((s) => s.zoomIn)
  const zoomOut = useUiStore((s) => s.zoomOut)
  const resetZoom = useUiStore((s) => s.resetZoom)

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (20 MB max)
    if (file.size > 20 * 1024 * 1024) {
      alert('Image too large. Maximum size is 20 MB.')
      e.target.value = ''
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string

      const img = new Image()
      img.onload = () => {
        // Validate dimensions
        if (img.naturalWidth > 10000 || img.naturalHeight > 10000) {
          alert('Image dimensions too large. Maximum is 10000x10000 pixels.')
          return
        }

        const bufReader = new FileReader()
        bufReader.onload = () => {
          useUiStore.getState().setPendingBackground({
            dataUrl,
            buffer: bufReader.result as ArrayBuffer,
            width: img.naturalWidth,
            height: img.naturalHeight,
          })
          useUiStore.getState().setShowPageSizeDialog(true)
        }
        bufReader.readAsArrayBuffer(file)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSave() {
    try {
      await saveTemplate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    }
  }

  function handleOpen() {
    fileInputRef.current?.click()
  }

  async function handleOpenFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await openTemplate(file)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to open file')
    }
    e.target.value = ''
  }

  // When no background, show minimal toolbar
  if (!hasBackground) {
    return (
      <div className="tg-toolbar">
        <div className="tg-toolbar-group">
          <button className="tg-btn tg-btn--primary" onClick={() => bgInputRef.current?.click()}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Upload Background
          </button>
          <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={handleBgUpload} />
        </div>
        <div className="tg-toolbar-separator" />
        <div className="tg-toolbar-group">
          <button className="tg-btn" onClick={handleOpen}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Open .tgbl
          </button>
          <input ref={fileInputRef} type="file" accept=".tgbl" hidden onChange={handleOpenFile} />
        </div>
        <div style={{ flex: 1 }} />
        <button className="tg-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          TemplateGoblin
        </span>
      </div>
    )
  }

  return (
    <div className="tg-toolbar">
      {/* Open / Upload — leftmost */}
      <div className="tg-toolbar-group">
        <button className="tg-btn" onClick={handleOpen}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Open
        </button>
        <input ref={fileInputRef} type="file" accept=".tgbl" hidden onChange={handleOpenFile} />
        <button className="tg-btn" onClick={() => bgInputRef.current?.click()}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          BG
        </button>
        <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={handleBgUpload} />
      </div>

      <div className="tg-toolbar-separator" />

      {/* Field tools */}
      <div className="tg-toolbar-group">
        <button
          className={`tg-btn ${activeTool === 'addText' ? 'tg-btn--active' : ''}`}
          onClick={() => setActiveTool(activeTool === 'addText' ? 'select' : 'addText')}
          disabled={locked || !hasBackground}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          Text
        </button>
        <button
          className={`tg-btn ${activeTool === 'addImage' ? 'tg-btn--active' : ''}`}
          onClick={() => setActiveTool(activeTool === 'addImage' ? 'select' : 'addImage')}
          disabled={locked || !hasBackground}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Image
        </button>
        <button
          className={`tg-btn ${activeTool === 'addLoop' ? 'tg-btn--active' : ''}`}
          onClick={() => setActiveTool(activeTool === 'addLoop' ? 'select' : 'addLoop')}
          disabled={locked || !hasBackground}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          Loop
        </button>
      </div>

      <div className="tg-toolbar-separator" />

      {/* Undo/Redo */}
      <div className="tg-toolbar-group">
        <button className="tg-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button className="tg-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </div>

      <div className="tg-toolbar-separator" />

      {/* View controls */}
      <div className="tg-toolbar-group">
        <button
          className={`tg-btn ${showGrid ? 'tg-btn--active' : ''}`}
          onClick={() => setShowGrid(!showGrid)}
        >
          Snap
        </button>
        <button className="tg-btn" onClick={zoomOut} title="Zoom out">
          -
        </button>
        <button
          className="tg-btn"
          onClick={resetZoom}
          style={{ minWidth: 48, justifyContent: 'center' }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button className="tg-btn" onClick={zoomIn} title="Zoom in">
          +
        </button>
      </div>

      {/* Spacer pushes remaining buttons to far right */}
      <div style={{ flex: 1 }} />

      {/* Fonts & Theme */}
      <div className="tg-toolbar-group">
        <button className="tg-btn" onClick={() => setShowFontManager(true)}>
          Fonts
        </button>
        <button className="tg-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </div>

      <div className="tg-toolbar-separator" />

      {/* Preview — end group */}
      <button
        className="tg-btn"
        onClick={() => setShowPreview(!showPreview)}
        disabled={!hasBackground}
        title="Preview template"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Preview
      </button>

      {/* Lock */}
      <button
        className={`tg-btn ${locked ? 'tg-btn--active' : ''}`}
        onClick={() => setLocked(!locked)}
        title={locked ? 'Unlock template' : 'Lock template'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {locked ? (
            <>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </>
          ) : (
            <>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </>
          )}
        </svg>
        {locked ? 'Unlock' : 'Lock'}
      </button>

      {/* Save — last, green */}
      <button
        className="tg-btn"
        style={{ background: '#16a34a', color: '#fff', borderRadius: 6 }}
        onClick={handleSave}
        title="Save template (Ctrl+S)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        Save
      </button>
    </div>
  )
}
