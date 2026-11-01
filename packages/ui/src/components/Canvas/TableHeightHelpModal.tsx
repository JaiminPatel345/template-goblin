import { CloseIcon } from '../icons/index.js'

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
      <div className="tg-dialog" style={{ width: 500, maxHeight: '85vh', overflow: 'auto' }}>
        <div className="tg-dialog-header">
          <h3 style={{ margin: 0, fontSize: 16 }}>Table Height Modes Comparison</h3>
          <button
            className="tg-btn tg-btn--icon"
            aria-label="Close"
            title="Close"
            onClick={onClose}
            data-testid="table-help-modal-close"
          >
            <CloseIcon />
          </button>
        </div>

        <div
          className="tg-dialog-body"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--text)' }}>
              1. Fixed Height
            </h4>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>
              <strong>Best for:</strong> Pre-printed forms, certificates, or fixed-layout cards
              where the table must strictly obey the drawn canvas rectangle.
              <br />
              <strong>Behavior:</strong> Any rows that exceed the drawn box height are
              clipped/truncated. The page size never changes and elements below never shift.
            </p>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 6,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--text)' }}>
              2. Single Page (Dynamic Height)
            </h4>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>
              <strong>Best for:</strong> Invoices, bills, purchase orders, or receipts where all
              items must stay together on a single continuous page.
              <br />
              <strong>Behavior:</strong> The table dynamically expands to fit all rows. The PDF page
              height expands accordingly, and all elements below the table are shifted down to
              preserve their original spacing. Elements positioned beside the table stay at the top.
            </p>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 6,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--text)' }}>
              3. Multi-Page (Dynamic)
            </h4>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>
              <strong>Best for:</strong> Bank statements, transaction ledgers, catalogs, or
              multi-page reports.
              <br />
              <strong>Behavior:</strong> Keeps standard page dimensions. When rows exceed the page,
              it automatically creates continuation pages, repeating column headers and page
              headers/footers until all rows finish.
            </p>
          </div>
        </div>

        <div
          className="tg-dialog-actions"
          style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}
        >
          <button
            className="tg-btn tg-btn--primary"
            onClick={onClose}
            data-testid="table-help-modal-ok"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
