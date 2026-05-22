import { useUiStore } from '../../../store/uiStore.js'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'

/**
 * Format ribbon (#128). Most formatting controls live in the
 * field-properties panel today; this ribbon surfaces a deliberate
 * subset of selection-aware shortcuts (panel toggle + Fonts manager)
 * and degrades gracefully when nothing is selected — the buttons are
 * either disabled or document-wide actions only.
 *
 * Future work (#62, #64): bring inline font / colour / alignment
 * controls into this ribbon when a text field is selected.
 */
export function FormatRibbon() {
  const showLeftPanel = useUiStore((s) => s.showLeftPanel)
  const setShowLeftPanel = useUiStore((s) => s.setShowLeftPanel)
  const setShowFontManager = useUiStore((s) => s.setShowFontManager)
  const selectedFieldIds = useUiStore((s) => s.selectedFieldIds)
  const hasSelection = selectedFieldIds.length > 0

  return (
    <div style={{ display: 'flex' }}>
      <RibbonGroup label="Properties">
        <RibbonButton
          label={showLeftPanel ? 'Hide panel' : 'Show panel'}
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          active={showLeftPanel}
          variant="toggle"
          title={hasSelection ? 'Show / hide the properties panel' : 'No field selected'}
          testid="ribbon-toggle-properties"
        />
      </RibbonGroup>
      <RibbonGroup label="Typography">
        <RibbonButton
          label="Fonts…"
          onClick={() => setShowFontManager(true)}
          title="Open the fonts manager"
          testid="ribbon-fonts"
        />
      </RibbonGroup>
    </div>
  )
}
