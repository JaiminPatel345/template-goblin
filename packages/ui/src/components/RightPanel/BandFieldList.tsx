/**
 * BandFieldList — minimal field-list for header/footer band content (#61).
 *
 * Phase 1 supports text + image fields only (no tables per decision C).
 * Field props are still edited in the existing TextFieldProps /
 * ImageFieldProps when the user clicks into a band field on canvas — but
 * canvas drag-edit for band fields ships in Phase 2. For now, this list
 * is the way users add / remove band fields. Each row shows the label +
 * a Remove button.
 */
import type { FieldDefinition, TextField, ImageField } from '@template-goblin/types'

type BandKind = 'header' | 'footer'

interface Props {
  kind: BandKind
  fields: FieldDefinition[]
  bandHeight: number
  /** Add a default text or image field to the band. */
  onAdd: (field: FieldDefinition) => void
  /** Remove a band field by id. */
  onRemove: (id: string) => void
}

function generateBandFieldId(kind: BandKind, type: string): string {
  return `${kind}-${type}-${Math.random().toString(36).slice(2, 9)}`
}

function defaultBandText(kind: BandKind, bandHeight: number): TextField {
  const safeHeight = Math.max(12, Math.min(bandHeight, 24))
  return {
    id: generateBandFieldId(kind, 'text'),
    pageId: null,
    groupId: null,
    label: kind === 'header' ? 'Header text' : 'Footer text',
    type: 'text',
    x: 0,
    y: 0,
    width: 200,
    height: safeHeight,
    zIndex: 1,
    source: { mode: 'static', value: '' },
    style: {
      fontId: null,
      fontFamily: 'Helvetica',
      fontSize: 10,
      fontSizeMin: 8,
      lineHeight: 1.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
      align: 'left',
      verticalAlign: 'middle',
      maxRows: 1,
      overflowMode: 'truncate',
      snapToGrid: true,
    },
  }
}

function defaultBandImage(kind: BandKind, bandHeight: number): ImageField {
  const safeHeight = Math.max(12, Math.min(bandHeight, 30))
  return {
    id: generateBandFieldId(kind, 'image'),
    pageId: null,
    groupId: null,
    label: kind === 'header' ? 'Header image' : 'Footer image',
    type: 'image',
    x: 0,
    y: 0,
    width: safeHeight, // square by default; user resizes after
    height: safeHeight,
    zIndex: 1,
    source: { mode: 'static', value: { filename: '' } },
    style: { fit: 'contain' },
  }
}

export function BandFieldList({ kind, fields, bandHeight, onAdd, onRemove }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fields ({fields.length})</div>
      {fields.length === 0 && (
        <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)' }}>
          No {kind} fields yet. Use the buttons below to add one.
        </div>
      )}
      {fields.map((f) => (
        <div
          key={f.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          <span>
            <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{f.type}</span>
            {f.label}
          </span>
          <button
            className="tg-btn"
            style={{ fontSize: 11, padding: '2px 6px' }}
            onClick={() => onRemove(f.id)}
            aria-label={`Remove ${f.label}`}
          >
            Remove
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <button
          className="tg-btn"
          style={{ flex: 1, fontSize: 11 }}
          onClick={() => onAdd(defaultBandText(kind, bandHeight))}
        >
          + Add text
        </button>
        <button
          className="tg-btn"
          style={{ flex: 1, fontSize: 11 }}
          onClick={() => onAdd(defaultBandImage(kind, bandHeight))}
        >
          + Add image
        </button>
      </div>
    </div>
  )
}
