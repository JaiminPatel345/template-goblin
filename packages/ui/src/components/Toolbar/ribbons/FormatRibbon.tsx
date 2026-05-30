import { useUiStore } from '../../../store/uiStore.js'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'
import { TextStyleRibbonGroup } from './TextStyleRibbonGroup.js'

/**
 * Format ribbon (#128). Surfaces selection-aware formatting shortcuts
 * (panel toggle, the #167 Text-style group, Fonts manager) and degrades
 * gracefully when nothing is selected — the Text-style controls disable
 * and the rest stay document-wide.
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
      <TextStyleRibbonGroup />
      <RibbonGroup label="Typography">
        <RibbonButton
          label="Font Manager"
          onClick={() => setShowFontManager(true)}
          title="Open the font manager"
          testid="ribbon-fonts"
        />
      </RibbonGroup>
    </div>
  )
}
