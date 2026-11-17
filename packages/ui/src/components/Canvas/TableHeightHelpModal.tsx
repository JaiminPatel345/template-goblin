import { CloseIcon } from '../icons/index.js'
import { FixedHeightIcon, SinglePageDynamicIcon, MultiPageDynamicIcon } from './tableHeightIcons.js'

export interface TableHeightHelpModalProps {
  onClose: () => void
}

/**
 * Help modal explaining the differences between table height modes:
 * Fixed Height, Single Page Dynamic, and Multi-Page.
 */
export function TableHeightHelpModal({ onClose }: TableHeightHelpModalProps) {
  return (
    <div
      className="tg-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Table Height Modes Comparison"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 1100 }}
    >
      <div
        className="tg-dialog"
        style={{
          width: 520,
          maxHeight: '85vh',
          overflow: 'auto',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div
          className="tg-dialog-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Table Height Modes Comparison
          </h3>
          <button
            className="tg-btn"
            aria-label="Close"
            title="Close"
            onClick={onClose}
            data-testid="table-help-modal-close"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              padding: 0,
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon />
          </button>
        </div>

        <div
          className="tg-dialog-body"
          style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
                <FixedHeightIcon />
              </span>
              <h4
                style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}
              >
                1. Fixed Height
              </h4>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  marginLeft: 'auto',
                }}
              >
                Clipped
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Best for:</strong> Pre-printed forms,
              certificates, or fixed-layout cards where the table must strictly obey the drawn
              canvas rectangle.
              <br />
              <strong style={{ color: 'var(--text-primary)' }}>Behavior:</strong> Any rows exceeding
              the drawn box height are clipped. Page size never changes and elements below never
              shift.
            </p>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--bg-surface)',
              border: '1px solid var(--accent-soft-hover)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
                <SinglePageDynamicIcon />
              </span>
              <h4
                style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}
              >
                2. Single Page Dynamic (Default)
              </h4>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  marginLeft: 'auto',
                }}
              >
                Auto-expands
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Best for:</strong> Invoices, bills,
              purchase orders, and receipts where all items must stay together on a single
              continuous page.
              <br />
              <strong style={{ color: 'var(--text-primary)' }}>Behavior:</strong> Automatically
              expands table and page height to fit all rows. Pushes down all content below to
              preserve margins, while elements beside the table remain anchored.
            </p>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
                <MultiPageDynamicIcon />
              </span>
              <h4
                style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}
              >
                3. Multi-Page Dynamic
              </h4>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  marginLeft: 'auto',
                }}
              >
                Continuation
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Best for:</strong> Bank statements,
              transaction ledgers, or multi-page catalog reports.
              <br />
              <strong style={{ color: 'var(--text-primary)' }}>Behavior:</strong> Retains standard
              physical page dimensions. When rows exceed the page, automatically splits across
              continuation pages with repeating headers.
            </p>
          </div>
        </div>

        <div
          className="tg-dialog-actions"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            className="tg-btn tg-btn--primary"
            onClick={onClose}
            data-testid="table-help-modal-ok"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 18px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              background: 'var(--accent)',
              color: 'var(--text-on-accent)',
              border: '1px solid var(--accent-hover)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
              transition: 'all 0.15s ease',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
