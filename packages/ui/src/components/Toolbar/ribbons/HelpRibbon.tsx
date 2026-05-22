import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'

/**
 * Help ribbon (#128). Lightweight today — repo link + a stub for the
 * keyboard-shortcuts dialog (#117). Lives on its own tab so power users
 * can find these without crowding the everyday tabs.
 */
export function HelpRibbon() {
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
            alert(
              'Keyboard shortcuts:\n  Ctrl+Z — Undo\n  Ctrl+Shift+Z — Redo\n  Ctrl+S — Save\n  Delete / Backspace — Remove selected field\n  Esc — Deselect',
            )
          }
          title="View keyboard shortcuts"
          testid="ribbon-help-shortcuts"
        />
      </RibbonGroup>
    </div>
  )
}
