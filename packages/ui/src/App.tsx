import { Toolbar } from './components/Toolbar/Toolbar.js'
import { LeftPanel } from './components/LeftPanel/FieldList.js'
import { CanvasArea } from './components/Canvas/CanvasArea.js'
import { RightPanel } from './components/RightPanel/RightPanel.js'
import { PageSizeDialog } from './components/Toolbar/PageSizeDialog.js'
import { ContextMenu } from './components/Canvas/ContextMenu.js'
import { FontManager } from './components/Toolbar/FontManager.js'
import { PdfPreview } from './components/Preview/PdfPreview.js'
import { useKeyboard } from './hooks/useKeyboard.js'
import { useUiStore } from './store/uiStore.js'
import { useTemplateStore } from './store/templateStore.js'
import './App.css'

export function App() {
  useKeyboard()

  const theme = useUiStore((s) => s.theme)
  const hasBackground = useTemplateStore((s) => s.backgroundDataUrl !== null)
  const showLeftPanel = useUiStore((s) => s.showLeftPanel)
  const showRightPanel = useUiStore((s) => s.showRightPanel)
  const showPageSizeDialog = useUiStore((s) => s.showPageSizeDialog)
  const showFontManager = useUiStore((s) => s.showFontManager)
  const showPreview = useUiStore((s) => s.showPreview)
  const contextMenu = useUiStore((s) => s.contextMenu)
  const locked = useTemplateStore((s) => s.meta.locked)

  return (
    <div className="tg-app" data-theme={theme}>
      <Toolbar />
      <div className="tg-workspace">
        {hasBackground && showLeftPanel && <LeftPanel />}
        <div className="tg-canvas-container">
          <CanvasArea />
          {locked && hasBackground && (
            <div className="tg-locked-overlay">
              <div className="tg-locked-badge">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Template Locked
              </div>
            </div>
          )}
        </div>
        {hasBackground && showRightPanel && <RightPanel />}
        {hasBackground && showPreview && <PdfPreview />}
      </div>
      {showPageSizeDialog && <PageSizeDialog />}
      {showFontManager && <FontManager />}
      {contextMenu && <ContextMenu />}
    </div>
  )
}
