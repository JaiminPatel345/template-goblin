import React from 'react'

/**
 * Last-resort React error boundary — a render crash anywhere below shows
 * a calm "Internal error" panel instead of a white screen, with the full
 * error printed to the console. Template data lives in IndexedDB, so a
 * reload loses nothing.
 */
interface Props {
  children: React.ReactNode
}

interface State {
  crashed: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { crashed: false }

  static getDerivedStateFromError(): State {
    return { crashed: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[template-goblin] UI crashed:', error, info.componentStack)
  }

  render(): React.ReactNode {
    if (!this.state.crashed) return this.props.children
    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: 'var(--bg-primary, #111)',
          color: 'var(--text-primary, #eee)',
          fontFamily: 'system-ui, sans-serif',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>Internal error</h1>
        <p style={{ maxWidth: 420, fontSize: 14, color: 'var(--text-secondary, #aaa)' }}>
          Something unexpected went wrong and the editor had to stop. Your template is saved locally
          — reloading the page brings it back. Technical details were printed to the browser console
          (F12).
        </p>
        <button
          className="tg-btn tg-btn--primary"
          style={{ padding: '8px 20px', cursor: 'pointer' }}
          onClick={() => window.location.reload()}
        >
          Reload editor
        </button>
      </div>
    )
  }
}

/**
 * Catch errors that escape React entirely (event handlers, async code,
 * unhandled promise rejections). Shows a small dismissible "Internal
 * error" toast via plain DOM — deliberately framework-free so it still
 * works if React itself is broken — and logs the full error.
 */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    console.error('[template-goblin] uncaught error:', event.error ?? event.message)
    showInternalErrorToast()
  })
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[template-goblin] unhandled promise rejection:', event.reason)
    showInternalErrorToast()
  })
}

const TOAST_ID = 'tg-internal-error-toast'

function showInternalErrorToast(): void {
  if (document.getElementById(TOAST_ID)) return // one at a time
  const toast = document.createElement('div')
  toast.id = TOAST_ID
  toast.setAttribute('role', 'alert')
  toast.style.cssText = [
    'position:fixed',
    'bottom:16px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:10000',
    'display:flex',
    'align-items:center',
    'gap:10px',
    'padding:10px 14px',
    'border-radius:8px',
    'background:#2a1215',
    'border:1px solid #e5484d',
    'color:#ffd1d4',
    'font:13px system-ui, sans-serif',
    'box-shadow:0 8px 24px rgba(0,0,0,0.4)',
    'max-width:90vw',
  ].join(';')
  const text = document.createElement('span')
  text.textContent =
    'Internal error — something unexpected went wrong. Details are in the browser console (F12).'
  const close = document.createElement('button')
  close.textContent = '×'
  close.setAttribute('aria-label', 'Dismiss')
  close.style.cssText =
    'background:none;border:none;color:inherit;font-size:16px;cursor:pointer;padding:0 2px'
  close.onclick = () => toast.remove()
  toast.append(text, close)
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 10000)
}
