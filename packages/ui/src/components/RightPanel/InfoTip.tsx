/**
 * InfoTip — interactive hover/tap tooltip popover with accessible button
 * and theme-aware popover styling used across right-panel forms.
 */
import { useState, useRef, useEffect, type ReactNode } from 'react'

export interface InfoTipProps {
  /** Text content for simple tooltips */
  text?: string
  /** Optional title heading for rich popovers */
  title?: string
  /** Vertical placement relative to the icon button ('top' or 'bottom') */
  placement?: 'top' | 'bottom'
  /** Horizontal alignment ('left', 'center', or 'right') */
  align?: 'left' | 'center' | 'right'
  /** Rich custom body content */
  children?: ReactNode
  /** Accessible label for screen readers */
  ariaLabel?: string
  /** Test identifier for the trigger button */
  dataTestId?: string
}

/**
 * Renders an info icon button that reveals an informative tooltip or popover card
 * on hover or click. Supports keyboard navigation, click-outside dismissal,
 * and custom placement/alignment.
 */
export function InfoTip({
  text,
  title,
  placement = 'top',
  align = 'center',
  children,
  ariaLabel = 'More information',
  dataTestId = 'info-tip-btn',
}: InfoTipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openTooltip() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }

  function closeTooltipWithDelay() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isOpen])

  const alignmentStyle: React.CSSProperties =
    align === 'left'
      ? { left: 0 }
      : align === 'right'
        ? { right: 0 }
        : { left: '50%', transform: 'translateX(-50%)' }

  const placementStyle: React.CSSProperties =
    placement === 'bottom' ? { top: 'calc(100% + 6px)' } : { bottom: 'calc(100% + 6px)' }

  return (
    <span
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        marginLeft: 4,
      }}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltipWithDelay}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        data-testid={dataTestId}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          padding: 0,
          width: 16,
          height: 16,
          minWidth: 16,
          borderRadius: '50%',
          border: '1px solid transparent',
          background: isOpen || isHovered ? 'var(--accent-soft)' : 'transparent',
          color: isOpen || isHovered ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 150ms ease',
          outline: 'none',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="tooltip"
          data-testid="info-tip-popover"
          onMouseEnter={openTooltip}
          onMouseLeave={closeTooltipWithDelay}
          style={{
            position: 'absolute',
            ...placementStyle,
            ...alignmentStyle,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 11,
            color: 'var(--text-primary)',
            zIndex: 1000,
            boxShadow: 'var(--shadow-popover)',
            width: 260,
            maxWidth: 'calc(100vw - 32px)',
            whiteSpace: 'normal',
            lineHeight: 1.45,
            textAlign: 'left',
          }}
        >
          {title && (
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: 'var(--text-primary)',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{title}</span>
              <button
                type="button"
                className="tg-remove-btn"
                aria-label="Close"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 12,
                  lineHeight: 1,
                  display: 'inline-flex',
                }}
              >
                ✕
              </button>
            </div>
          )}
          {text && (
            <div style={{ color: 'var(--text-secondary)', marginBottom: children ? 6 : 0 }}>
              {text}
            </div>
          )}
          {children}
        </div>
      )}
    </span>
  )
}
