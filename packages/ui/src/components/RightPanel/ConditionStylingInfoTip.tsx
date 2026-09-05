/**
 * Info button & popover explaining Condition-Based Styling (#43).
 *
 * Extracted into its own component to maintain Rule #11 (file <= 300 lines).
 */
import type { FieldDefinition } from '@template-goblin/types'
import { InfoTip } from './InfoTip.js'

interface Props {
  field: FieldDefinition
}

/**
 * Info button for condition-based styling that explains its purpose,
 * workflow, default fallback, and input JSON schema.
 */
export function ConditionStylingInfoTip({ field }: Props) {
  const sampleKey =
    (field.source?.mode === 'dynamic' && 'jsonKey' in field.source && field.source.jsonKey) ||
    field.id ||
    'status'

  return (
    <InfoTip
      title="Condition-Based Styling"
      placement="bottom"
      align="left"
      ariaLabel="Learn about condition-based styling"
      dataTestId="conditional-styling-info-btn"
    >
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
        <p style={{ margin: '0 0 6px 0' }}>
          Dynamically override this field&apos;s styling (colors, fonts, borders, etc.) at render
          time based on data conditions.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 8,
            fontSize: 10.5,
          }}
        >
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>1. Conditions:</strong> Add named rules
            (e.g. <code>urgent</code>, <code>paid</code>).
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>2. Overrides:</strong> Select only the
            properties to change.
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>3. Default:</strong> Fallback style
            when no condition is specified.
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>4. Canvas:</strong> Click any condition
            row to preview and edit its styling live.
          </div>
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: 3,
            letterSpacing: '0.04em',
          }}
        >
          INPUT JSON PAYLOAD:
        </div>
        <pre
          data-testid="conditional-styling-json-example"
          style={{
            margin: 0,
            padding: '6px 8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 10,
            lineHeight: 1.35,
            color: 'var(--accent)',
            overflowX: 'auto',
          }}
        >
          {JSON.stringify({ condition: [{ [sampleKey]: 'condition-name' }] }, null, 2)}
        </pre>
      </div>
    </InfoTip>
  )
}
