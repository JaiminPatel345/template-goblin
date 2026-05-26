import { useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { openTemplate } from '../../utils/saveOpen.js'
import { MenuTabBar } from './MenuTabBar.js'
import { RibbonBar } from './RibbonBar.js'
import { RibbonButton } from './primitives/RibbonButton.js'
import { useDialogs } from '../Dialogs/index.js'
import { MoonIcon, SunIcon, OpenIcon, BackgroundIcon } from './icons.js'

/**
 * Top-of-app toolbar (#128 redesign).
 *
 * Two shells:
 *   1. Empty-state — the user has no background yet. Show the same
 *      tight call-to-action card the onboarding flow renders, so we
 *      don't ship a half-empty Word ribbon over a blank canvas.
 *   2. Editor shell — `MenuTabBar` (row 1: tabs + pinned tools + CTAs)
 *      + `RibbonBar` (row 2: active tab's controls). Each row is its
 *      own component; this file stays under 100 lines.
 */
export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  const hasBackground = useTemplateStore(
    (s) =>
      s.backgroundDataUrl !== null ||
      s.pages.some(
        (p) => p.index === 0 && (p.backgroundType === 'color' || p.backgroundType === 'image'),
      ),
  )
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const { alert: showAlert } = useDialogs()

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      void showAlert({
        title: 'Image too large',
        message: 'Maximum size is 20 MB.',
        variant: 'danger',
      })
      e.target.value = ''
      return
    }
    if (!file.type.startsWith('image/')) {
      void showAlert({
        title: 'Not an image',
        message: 'Please select an image file.',
        variant: 'warning',
      })
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        if (img.naturalWidth > 10000 || img.naturalHeight > 10000) {
          void showAlert({
            title: 'Image too big',
            message: 'Image dimensions too large. Maximum is 10000×10000 pixels.',
            variant: 'danger',
          })
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

  async function handleOpenFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await openTemplate(file)
    } catch (err) {
      await showAlert({
        title: 'Failed to open file',
        message: err instanceof Error ? err.message : 'Failed to open file',
        variant: 'danger',
      })
    }
    e.target.value = ''
  }

  // ── Empty state: render a minimal top strip with Upload + Open + theme.
  //    The onboarding picker fills the canvas — this just frames the page.
  if (!hasBackground) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <RibbonButton
          icon={<BackgroundIcon />}
          label="Upload Background"
          onClick={() => bgInputRef.current?.click()}
          variant="primary"
          compact
          testid="toolbar-upload-background"
        />
        <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={handleBgUpload} />
        <RibbonButton
          icon={<OpenIcon />}
          label="Open .tgbl"
          onClick={() => fileInputRef.current?.click()}
          compact
          testid="toolbar-open"
        />
        <input ref={fileInputRef} type="file" accept=".tgbl" hidden onChange={handleOpenFile} />
        <div style={{ flex: 1 }} />
        <RibbonButton
          icon={theme === 'light' ? <MoonIcon /> : <SunIcon />}
          onClick={toggleTheme}
          compact
          title="Toggle theme"
          ariaLabel="Toggle theme"
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          TemplateGoblin
        </span>
      </div>
    )
  }

  // ── Editor shell: menu tab strip + active-tab ribbon.
  // `data-testid` is used by the global mousedown handler in MenuTabBar
  // (#159) to detect 'clicked outside the toolbar' for ribbon-collapse.
  return (
    <div role="region" aria-label="Application toolbar" data-testid="toolbar-shell">
      <MenuTabBar />
      <RibbonBar />
    </div>
  )
}
