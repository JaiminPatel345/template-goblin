import { useTemplateStore } from '../../store/templateStore.js'
import type { FieldDefinition } from '@template-goblin/types'

/**
 * Static / Dynamic mode toggle shown at the top of every field's
 * properties panel (GH #26). Calling `setFieldMode` migrates the field's
 * value↔placeholder so the user never silently loses content on the flip.
 */
export function SourceModeToggle({ field }: { field: FieldDefinition }) {
  const setFieldMode = useTemplateStore((s) => s.setFieldMode)
  const mode = field.source?.mode ?? 'static'

  function buttonStyle(active: boolean): React.CSSProperties {
    return {
      flex: 1,
      padding: '6px 10px',
      fontSize: 12,
      fontWeight: 600,
      cursor: active ? 'default' : 'pointer',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#fff' : 'var(--text-primary)',
      border: 'none',
      borderRadius: 4,
    }
  }

  return (
    <div className="tg-panel-section">
      <div className="tg-panel-section-title">Source</div>
      <div
        role="tablist"
        aria-label="Field source mode"
        style={{
          display: 'flex',
          gap: 4,
          padding: 2,
          borderRadius: 6,
          background: 'var(--bg-tertiary)',
        }}
      >
        <button
          role="tab"
          aria-selected={mode === 'static'}
          data-testid="source-mode-static"
          style={buttonStyle(mode === 'static')}
          onClick={() => mode !== 'static' && setFieldMode(field.id, 'static')}
        >
          Static
        </button>
        <button
          role="tab"
          aria-selected={mode === 'dynamic'}
          data-testid="source-mode-dynamic"
          style={buttonStyle(mode === 'dynamic')}
          onClick={() => mode !== 'dynamic' && setFieldMode(field.id, 'dynamic')}
        >
          Dynamic
        </button>
      </div>
    </div>
  )
}
