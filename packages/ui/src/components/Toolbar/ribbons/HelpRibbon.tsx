import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'
import { useDialogs } from '../../Dialogs/index.js'

/**
 * Help ribbon (#128). Lightweight today — repo link + a stub for the
 * keyboard-shortcuts dialog (#117). Lives on its own tab so power users
 * can find these without crowding the everyday tabs.
 */
export function HelpRibbon() {
  const { alert: showAlert } = useDialogs()
  return (
    <div style={{ display: 'flex' }}>
      <RibbonGroup label="Resources">
        <RibbonButton
          label="GitHub"
          onClick={() =>
            window.open('https://github.com/JaiminPatel345/template-goblin', '_blank', 'noopener')
          }
          title="Open the TemplateGoblin repository on GitHub"
          testid="ribbon-help-github"
        />
        <RibbonButton
          label="Shortcuts"
          onClick={() =>
            void showAlert({
              title: 'Keyboard shortcuts',
              message:
                'Ctrl+Z — Undo\nCtrl+Shift+Z — Redo\nCtrl+S — Save\nCtrl+O — Open\nCtrl+0 — Reset zoom\nCtrl+Plus / Ctrl+Minus — Zoom in / out\nDelete / Backspace — Remove selected field\nEsc — Deselect / collapse ribbon',
            })
          }
          title="View keyboard shortcuts"
          testid="ribbon-help-shortcuts"
        />
      </RibbonGroup>
    </div>
  )
}
