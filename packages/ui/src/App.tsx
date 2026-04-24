import { useState } from 'react'
import { Toolbar } from './components/Toolbar/Toolbar.js'
import { PropertiesPanel } from './components/LeftPanel/PropertiesPanel.js'
import { CanvasArea } from './components/Canvas/CanvasArea.js'
import { StructurePanel } from './components/RightPanel/StructurePanel.js'
import { PageSizeDialog } from './components/Toolbar/PageSizeDialog.js'
import { ContextMenu } from './components/Canvas/ContextMenu.js'
import { FontManager } from './components/Toolbar/FontManager.js'
import { PdfPreview } from './components/Preview/PdfPreview.js'
import { ImageCompressor } from './components/Toolbar/ImageCompressor.js'
import { ResizeHandle } from './components/ResizeHandle.js'
import { useKeyboard } from './hooks/useKeyboard.js'
import { useUiStore } from './store/uiStore.js'
import { useTemplateStore } from './store/templateStore.js'
import './App.css'

export function App() {
  useKeyboard()

  const theme = useUiStore((s) => s.theme)
  // Onboarding is complete once page 0 has ANY concrete background — either
  // the legacy image (stored as `backgroundDataUrl`) OR a solid color set via
  // the onboarding picker (stored on `pages[0]`). Without this second check,
  // picking solid color leaves `backgroundDataUrl: null` and the side panels
  // would stay hidden (BUG-B).
  const hasBackground = useTemplateStore((s) => {
    if (s.backgroundDataUrl !== null) return true
    const page0 = s.pages.find((p) => p.index === 0)
    return (
      page0 !== undefined && (page0.backgroundType === 'color' || page0.backgroundType === 'image')
    )
  })
  const showLeftPanel = useUiStore((s) => s.showLeftPanel)
  const showRightPanel = useUiStore((s) => s.showRightPanel)
  const showPageSizeDialog = useUiStore((s) => s.showPageSizeDialog)
  const showFontManager = useUiStore((s) => s.showFontManager)
  const contextMenu = useUiStore((s) => s.contextMenu)
  const locked = useTemplateStore((s) => s.meta.locked)

  const [leftWidth, setLeftWidth] = useState(260)
  const [rightWidth, setRightWidth] = useState(300)

  return (
    <div className="tg-app" data-theme={theme}>
      <Toolbar />
      <div className="tg-workspace">
        {hasBackground && showLeftPanel && (
          <div className="tg-left-panel" style={{ width: leftWidth }}>
            {/* Left panel now renders the styling/properties editor for the
                active selection (GH #19 — content swapped with the right
                panel). */}
            <PropertiesPanel />
            <ResizeHandle
              side="right"
              width={leftWidth}
              onResize={setLeftWidth}
              min={180}
              max={400}
            />
          </div>
        )}
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
        {hasBackground && showRightPanel && (
          <div className="tg-right-panel" style={{ width: rightWidth }}>
            <ResizeHandle
              side="left"
              width={rightWidth}
              onResize={setRightWidth}
              min={220}
              max={500}
            />
            {/* Right panel now renders the structural tree — field list +
                JSON preview + PDF size estimate (GH #19). */}
            <StructurePanel />
          </div>
        )}
      </div>
      <PdfPreview />
      {showPageSizeDialog && <PageSizeDialog />}
      {showFontManager && <FontManager />}
      <ImageCompressor />
      {contextMenu && <ContextMenu />}
    </div>
  )
}
