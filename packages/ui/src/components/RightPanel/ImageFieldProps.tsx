import { useRef } from 'react'
import type { FieldDefinition, ImageField, ImageFieldStyle } from '@template-goblin/types'
import { isSafeKey } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'

interface Props {
  field: ImageField
}

export function ImageFieldProps({ field }: Props) {
  const updateField = useTemplateStore((s) => s.updateField)
  const updateFieldStyle = useTemplateStore((s) => s.updateFieldStyle)
  const addPlaceholder = useTemplateStore((s) => s.addPlaceholder)
  const groups = useTemplateStore((s) => s.groups)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const style: ImageFieldStyle = field.style

  // Phase 1 UI edits only dynamic image fields via the right panel.
  const isDynamic = field.source.mode === 'dynamic'
  const dynamicSource = isDynamic
    ? (field.source as {
        mode: 'dynamic'
        jsonKey: string
        required: boolean
        placeholder: { filename: string } | null
      })
    : null
  const displayKey = dynamicSource?.jsonKey ?? ''

  function onJsonKeyChange(value: string) {
    const cleaned = value.replace(/^images\./, '')
    if (cleaned !== '' && !isSafeKey(cleaned)) return
    if (!dynamicSource) return
    updateField(field.id, {
      source: { ...dynamicSource, jsonKey: cleaned },
    } as Partial<FieldDefinition>)
  }

  function onRequiredChange(required: boolean) {
    if (!dynamicSource) return
    updateField(field.id, {
      source: { ...dynamicSource, required },
    } as Partial<FieldDefinition>)
  }

  function handlePlaceholderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!dynamicSource) return

    const reader = new FileReader()
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer
      const filename = `placeholder-${field.id}-${file.name}`
      addPlaceholder(filename, buffer)
      updateField(field.id, {
        source: { ...dynamicSource, placeholder: { filename } },
      } as Partial<FieldDefinition>)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const placeholderFilename = dynamicSource?.placeholder?.filename ?? null

  return (
    <>
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Field Properties</div>

        <div className="tg-form-row">
          <label>JSON Key</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>images.</span>
            <input
              className="tg-input"
              value={displayKey}
              disabled={!dynamicSource}
              onChange={(e) => onJsonKeyChange(e.target.value)}
            />
          </div>
        </div>

        <div className="tg-form-row">
          <label>Group</label>
          <select
            className="tg-select"
            value={field.groupId ?? ''}
            onChange={(e) => updateField(field.id, { groupId: e.target.value || null })}
          >
            <option value="">None</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="tg-toggle-row">
          <label>Required</label>
          <input
            type="checkbox"
            className="tg-checkbox"
            checked={dynamicSource?.required ?? false}
            disabled={!dynamicSource}
            onChange={(e) => onRequiredChange(e.target.checked)}
          />
        </div>
      </div>

      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Image Settings</div>

        <div className="tg-form-row">
          <label>Fit Mode</label>
          <select
            className="tg-select"
            value={style.fit}
            onChange={(e) =>
              updateFieldStyle(field.id, { fit: e.target.value as 'fill' | 'contain' | 'cover' })
            }
          >
            <option value="fill">Fill</option>
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Placeholder Image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="tg-btn"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: 11 }}
              disabled={!dynamicSource}
            >
              Upload
            </button>
            {placeholderFilename && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {placeholderFilename}
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePlaceholderUpload}
          />
        </div>
      </div>
    </>
  )
}
