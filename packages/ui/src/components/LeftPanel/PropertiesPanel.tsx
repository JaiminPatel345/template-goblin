import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { TextFieldProps } from '../RightPanel/TextFieldProps.js'
import { ImageFieldProps } from '../RightPanel/ImageFieldProps.js'
import { LoopFieldProps } from '../RightPanel/LoopFieldProps.js'
import { RotationSection } from './RotationSection.js'
import { GroupPropertiesPanel } from './GroupPropertiesPanel.js'
import { ConditionalStylingSection } from '../RightPanel/ConditionalStylingSection.js'

/**
 * Left-panel content under the new layout (GH #19): the styling / properties
 * editor for the currently selected field. The old sidebar layout had these
 * controls on the right; they moved to the left so the canvas and the
 * structural tree (field list + JSON preview) sit side-by-side on the right.
 *
 * #61 — band fields (header / footer) coexist with body fields in the
 * selection store. We look across body + both bands to resolve the
 * currently-selected id, then render the field's normal property editor.
 * The template-wide header / footer / page-number settings live in the
 * "Page Layout" toolbar dialog rather than this sidebar (matches the
 * Word / Google Docs "Insert > Header & Footer" pattern).
 */
import { resolveUiField } from '../../utils/conditionalStyle.js'

export function PropertiesPanel() {
  const selectedIds = useUiStore((s) => s.selectedFieldIds)
  const fields = useTemplateStore((s) => s.fields)
  const header = useTemplateStore((s) => s.header)
  const footer = useTemplateStore((s) => s.footer)

  const selectedField =
    selectedIds.length === 1
      ? (fields.find((f) => f.id === selectedIds[0]) ??
        header?.fields.find((f) => f.id === selectedIds[0]) ??
        footer?.fields.find((f) => f.id === selectedIds[0]) ??
        null)
      : null

  if (selectedField === null) {
    return (
      <>
        <div
          className="tg-panel-section-title"
          style={{ padding: '16px 16px 0', margin: 0, textTransform: 'none' }}
        >
          Group properties
        </div>
        <div className="tg-panel-section">
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
              padding: '0 8px 16px',
            }}
          >
            {selectedIds.length > 1
              ? 'Multiple fields selected'
              : 'Select a field to edit its properties'}
          </div>
        </div>
        <GroupPropertiesPanel />
      </>
    )
  }

  const effectiveField = resolveUiField(selectedField)

  let title = 'Field properties'
  if (selectedField.type === 'text') title = 'Text properties'
  else if (selectedField.type === 'image') title = 'Image properties'
  else if (selectedField.type === 'table') title = 'Table properties'

  return (
    <>
      <div
        className="tg-panel-section-title"
        style={{ padding: '16px 16px 0', margin: 0, textTransform: 'none' }}
      >
        {title}
      </div>
      {/* key={id} — the props components hold per-field draft state (e.g.
          HyperlinkSection's URL/key inputs, seeded once per mount). Without
          remounting on selection change, switching between two same-type
          fields showed (and on blur, COMMITTED) field A's drafts onto
          field B — including silently deleting B's link when A had none. */}
      {effectiveField.type === 'text' && (
        <TextFieldProps key={selectedField.id} field={effectiveField} />
      )}
      {effectiveField.type === 'image' && (
        <ImageFieldProps key={selectedField.id} field={effectiveField} />
      )}
      {effectiveField.type === 'table' && (
        <LoopFieldProps key={selectedField.id} field={effectiveField} />
      )}
      {/* #172 — field-type-agnostic rotation control. */}
      <RotationSection field={effectiveField} />
      {/* Condition-based styling section for selected field */}
      <ConditionalStylingSection key={`cond-${selectedField.id}`} field={selectedField} />
    </>
  )
}
