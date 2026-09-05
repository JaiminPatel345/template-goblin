/**
 * Title row + ✕ close button for `PreviewDialog`. Extracted so the parent
 * stays under the 300-line cap (Hard Rule #11).
 */

export function PreviewDialogHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
      }}
    >
      <h3 className="tg-dialog-title" style={{ margin: 0 }}>
        Preview
      </h3>
      <button
        onClick={onClose}
        aria-label="Close preview dialog"
        data-testid="preview-close"
        className="tg-remove-btn"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
