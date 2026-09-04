import { useUiStore } from '../../../store/uiStore.js'
import { useTemplateStore } from '../../../store/templateStore.js'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'
import { TextStyleRibbonGroup } from './TextStyleRibbonGroup.js'
import type { FieldDefinition } from '@template-goblin/types'

/**
 * Format ribbon (#128). Surfaces selection-aware formatting shortcuts
 * (panel toggle, the #167 Text-style group, Fonts manager, Conditional styling)
 * and degrades gracefully when nothing is selected.
 */
export function FormatRibbon() {
  const showLeftPanel = useUiStore((s) => s.showLeftPanel)
  const setShowLeftPanel = useUiStore((s) => s.setShowLeftPanel)
  const setShowFontManager = useUiStore((s) => s.setShowFontManager)
  const selectedFieldIds = useUiStore((s) => s.selectedFieldIds)
  const hasSelection = selectedFieldIds.length > 0

  const fields = useTemplateStore((s) => s.fields)
  const header = useTemplateStore((s) => s.header)
  const footer = useTemplateStore((s) => s.footer)
  const updateField = useTemplateStore((s) => s.updateField)

  const selectedField =
    selectedFieldIds.length === 1
      ? (fields.find((f) => f.id === selectedFieldIds[0]) ??
        header?.fields.find((f) => f.id === selectedFieldIds[0]) ??
        footer?.fields.find((f) => f.id === selectedFieldIds[0]) ??
        null)
      : null

  const isCondEnabled = selectedField?.conditionalStyles?.enabled ?? false

  function toggleConditionalStyling() {
    if (!selectedField) return
    if (!showLeftPanel) setShowLeftPanel(true)
    const nextState = !isCondEnabled
    if (
      nextState &&
      (!selectedField.conditionalStyles || !selectedField.conditionalStyles.conditions?.length)
    ) {
      updateField(selectedField.id, {
        conditionalStyles: {
          enabled: true,
          conditions: [
            { id: 'cond-1', name: 'condition-1', isDefault: true, style: {} },
            { id: 'cond-2', name: 'condition-2', isDefault: false, style: {} },
          ],
        },
      } as Partial<FieldDefinition>)
    } else {
      updateField(selectedField.id, {
        conditionalStyles: {
          ...selectedField.conditionalStyles,
          enabled: nextState,
          conditions: selectedField.conditionalStyles?.conditions ?? [],
        },
      } as Partial<FieldDefinition>)
    }
  }

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
      <RibbonGroup label="Conditions">
        <RibbonButton
          label="Condition-based styling"
          onClick={toggleConditionalStyling}
          active={isCondEnabled}
          disabled={!selectedField}
          variant="toggle"
          title={
            selectedField
              ? 'Toggle condition-based styling for selected field'
              : 'Select a field to enable conditional styling'
          }
          testid="ribbon-toggle-conditional-styling"
        />
      </RibbonGroup>
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
