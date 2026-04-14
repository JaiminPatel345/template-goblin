import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { TextFieldProps } from './TextFieldProps.js'
import { ImageFieldProps } from './ImageFieldProps.js'
import { LoopFieldProps } from './LoopFieldProps.js'
import { JsonPreview } from './JsonPreview.js'
import { PdfSizeEstimate } from './PdfSizeEstimate.js'

export function RightPanel() {
  const selectedIds = useUiStore((s) => s.selectedFieldIds)
  const fields = useTemplateStore((s) => s.fields)

  const selectedField =
    selectedIds.length === 1 ? (fields.find((f) => f.id === selectedIds[0]) ?? null) : null

  return (
    <div className="tg-right-panel">
      {selectedField === null ? (
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
      ) : (
        <>
          {selectedField.type === 'text' && <TextFieldProps field={selectedField} />}
          {selectedField.type === 'image' && <ImageFieldProps field={selectedField} />}
          {selectedField.type === 'loop' && <LoopFieldProps field={selectedField} />}
        </>
      )}

      <JsonPreview />
      <PdfSizeEstimate />
    </div>
  )
}
