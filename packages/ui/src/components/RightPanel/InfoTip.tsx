/**
 * InfoTip — small hover/tap tooltip used across the right-panel forms.
 * Extracted from `TextFieldProps.tsx` per Hard Rule #11 (split oversized
 * files as you touch them).
 */
import { useState } from 'react'

export function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span
      style={{
        cursor: 'help',
        marginLeft: 4,
        color: 'var(--text-muted)',
        fontSize: 11,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      {show && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            color: 'var(--text-primary)',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            marginBottom: 4,
            maxWidth: 250,
            whiteSpace: 'normal',
            lineHeight: 1.4,
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
