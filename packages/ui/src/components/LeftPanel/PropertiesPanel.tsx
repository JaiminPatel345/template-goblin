import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { TextFieldProps } from '../RightPanel/TextFieldProps.js'
import { ImageFieldProps } from '../RightPanel/ImageFieldProps.js'
import { LoopFieldProps } from '../RightPanel/LoopFieldProps.js'

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
      <div className="tg-panel-section">
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: 12,
            textAlign: 'center',
            padding: '24px 8px',
          }}
        >
          {selectedIds.length > 1
            ? 'Multiple fields selected'
            : 'Select a field to edit its properties'}
        </div>
      </div>
    )
  }

  return (
    <>
      {selectedField.type === 'text' && <TextFieldProps field={selectedField} />}
      {selectedField.type === 'image' && <ImageFieldProps field={selectedField} />}
      {selectedField.type === 'table' && <LoopFieldProps field={selectedField} />}
    </>
  )
}
