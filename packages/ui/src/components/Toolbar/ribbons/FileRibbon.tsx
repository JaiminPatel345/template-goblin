import { useRef } from 'react'
import { useTemplateStore } from '../../../store/templateStore.js'
import { useUiStore } from '../../../store/uiStore.js'
import { openTemplate } from '../../../utils/saveOpen.js'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'
import { useDialogs } from '../../Dialogs/index.js'
import { NewIcon, OpenIcon, BackgroundIcon, DimensionsIcon } from '../icons.js'
import { surfaceError } from '../../../utils/friendlyError.js'

/**
 * File ribbon (#128). Save lives in the pinned-CTA slot at the far right
 * of the menu bar, not here — but New / Open / Change Background belong
 * to the File category and live here so users can find them by clicking
 * the File tab even though they're not visible on the pinned strip.
 */
export function FileRibbon() {
  const openInputRef = useRef<HTMLInputElement>(null)
  const setShowChangeBgDialog = useUiStore((s) => s.setShowChangeBgDialog)
  const setPageLayoutSettings = useUiStore((s) => s.setPageLayoutSettings)
  const { alert: showAlert, confirm: showConfirm } = useDialogs()

  async function handleOpenFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await openTemplate(file)
    } catch (err) {
      await showAlert({
        title: 'Failed to open file',
        message: surfaceError('open template', err, true),
        variant: 'danger',
      })
    }
    e.target.value = ''
  }

  async function handleNew() {
    const ok = await showConfirm({
      title: 'Start a new template?',
      message: 'Your current unsaved work will be lost.',
      confirmLabel: 'Start new',
      destructive: true,
    })
    if (!ok) return
    useTemplateStore.getState().reset()
    useUiStore.getState().clearSelection()
  }

  return (
    <div style={{ display: 'flex' }}>
      <RibbonGroup label="Document">
        <RibbonButton
          icon={<NewIcon />}
          label="New"
          onClick={handleNew}
          title="Start a new blank template"
          testid="toolbar-new"
        />
        <RibbonButton
          icon={<OpenIcon />}
          label="Open"
          onClick={() => openInputRef.current?.click()}
          title="Open a .tgbl template (Ctrl+O)"
          testid="toolbar-open"
        />
        <input ref={openInputRef} type="file" accept=".tgbl" hidden onChange={handleOpenFile} />
      </RibbonGroup>
      <RibbonGroup label="Page background & dimensions">
        <RibbonButton
          icon={<BackgroundIcon />}
          label="Change Background"
          onClick={() => setShowChangeBgDialog(true)}
          title="Change the current page's background"
          testid="toolbar-change-background"
        />
        <RibbonButton
          icon={<DimensionsIcon />}
          label="Change Dimensions"
          onClick={() => setPageLayoutSettings('resizePage')}
          title="Change the current page's dimensions (width & height)"
          testid="toolbar-change-dimensions"
        />
      </RibbonGroup>
    </div>
  )
}
