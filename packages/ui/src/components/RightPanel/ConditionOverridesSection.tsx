/**
 * Style overrides section for an active condition (#43).
 *
 * Extracted from `ConditionalStylingSection.tsx` to keep files under the 300-line cap (Rule #11).
 */
import type { FieldDefinition, ConditionStyleRule } from '@template-goblin/types'
import type { PropertyMeta } from './propertyDefinitions.js'
import { PropertyPickerDropdown } from './PropertyPickerDropdown.js'
import { IndividualPropertyControl } from './IndividualPropertyControls.js'

interface Props {
  field: FieldDefinition
  activeRule: ConditionStyleRule<unknown>
  availableProperties: PropertyMeta[]
  selectedPropIds: string[]
  allFontFamilies: string[]
  onToggleProp: (propId: string, enabled: boolean) => void
  onUpdateStyle: (patch: Record<string, unknown>) => void
  onRemoveProp: (propId: string) => void
}

/**
 * Renders the property picker dropdown and active property controls for a condition rule.
 */
export function ConditionOverridesSection({
  field,
  activeRule,
  availableProperties,
  selectedPropIds,
  allFontFamilies,
  onToggleProp,
  onUpdateStyle,
  onRemoveProp,
}: Props) {
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        STYLE OVERRIDES: <span style={{ color: 'var(--text-primary)' }}>{activeRule.name}</span>
      </div>

      <PropertyPickerDropdown
        properties={availableProperties}
        selectedPropIds={selectedPropIds}
        onToggleProperty={onToggleProp}
      />

      {selectedPropIds.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            padding: '6px 2px',
          }}
          data-testid="no-overrides-hint"
        >
          No properties overridden for this condition. Use the dropdown above to select properties.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selectedPropIds.map((propId) => {
            const meta = availableProperties.find((p) => p.id === propId)
            const label = meta?.label ?? propId
            return (
              <IndividualPropertyControl
                key={propId}
                field={field}
                propId={propId}
                label={label}
                style={(activeRule.style as Record<string, unknown>) ?? {}}
                allFontFamilies={allFontFamilies}
                onChange={onUpdateStyle}
                onRemove={() => onRemoveProp(propId)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
