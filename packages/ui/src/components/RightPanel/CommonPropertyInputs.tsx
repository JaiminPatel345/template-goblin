/**
 * Shared property override controls (Hyperlink and Group) for condition-based styling (#43).
 *
 * Extracted to maintain the 300-line cap (Rule #11).
 */
import type { FieldDefinition, Hyperlink, GroupDefinition } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'

interface Props {
  field: FieldDefinition
  propId: string
  style: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
}

/**
 * Renders shared property inputs like Link and Group Assignment.
 */
export function renderCommonPropertyInput({ field, propId, style, onChange }: Props) {
  if (propId === 'hyperlink') {
    return <HyperlinkOverrideInput field={field} style={style} onChange={onChange} />
  }

  if (propId === 'groupId') {
    return <GroupOverrideInput field={field} style={style} onChange={onChange} />
  }

  return null
}

function HyperlinkOverrideInput({
  field,
  style,
  onChange,
}: {
  field: FieldDefinition
  style: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
}) {
  const currentLink = (style.hyperlink as Hyperlink | null | undefined) ?? field.hyperlink
  const mode = currentLink ? currentLink.mode : 'none'
  const url = currentLink && currentLink.mode === 'static' ? currentLink.url : ''
  const key = currentLink && currentLink.mode === 'dynamic' ? currentLink.jsonKey : ''

  function handleModeChange(nextMode: 'none' | 'static' | 'dynamic') {
    if (nextMode === 'none') {
      onChange({ hyperlink: null })
    } else if (nextMode === 'static') {
      onChange({ hyperlink: { mode: 'static', url: url || 'https://' } })
    } else {
      onChange({ hyperlink: { mode: 'dynamic', jsonKey: key || '' } })
    }
  }

  function handleUrlChange(nextUrl: string) {
    onChange({ hyperlink: { mode: 'static', url: nextUrl } })
  }

  function handleKeyChange(nextKey: string) {
    const cleaned = nextKey.replace(/^links\./, '')
    onChange({ hyperlink: { mode: 'dynamic', jsonKey: cleaned } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="tg-form-row">
        <label>Mode</label>
        <select
          className="tg-select"
          data-testid="cond-hyperlink-mode"
          value={mode}
          onChange={(e) => handleModeChange(e.target.value as 'none' | 'static' | 'dynamic')}
        >
          <option value="none">None</option>
          <option value="static">Static URL</option>
          <option value="dynamic">Dynamic key</option>
        </select>
      </div>

      {mode === 'static' && (
        <div className="tg-form-row">
          <label>URL</label>
          <input
            type="text"
            className="tg-input"
            data-testid="cond-hyperlink-url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
        </div>
      )}

      {mode === 'dynamic' && (
        <div className="tg-form-row">
          <label>JSON key</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>links.</span>
            <input
              type="text"
              className="tg-input"
              data-testid="cond-hyperlink-key"
              placeholder="profile_url"
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function GroupOverrideInput({
  field,
  style,
  onChange,
}: {
  field: FieldDefinition
  style: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
}) {
  const groups = useTemplateStore((s) => s.groups)
  const currentGroupId =
    style.groupId !== undefined ? (style.groupId as string | null) : field.groupId

  const compatibleGroups = groups.filter(
    (g) =>
      !('type' in g) ||
      !(g as unknown as GroupDefinition).type ||
      (g as unknown as GroupDefinition).type === field.type,
  )

  return (
    <div className="tg-form-row">
      <label>Group</label>
      <select
        className="tg-select"
        data-testid="cond-group-id"
        value={currentGroupId ?? ''}
        onChange={(e) => onChange({ groupId: e.target.value || null })}
      >
        <option value="">None</option>
        {compatibleGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  )
}
