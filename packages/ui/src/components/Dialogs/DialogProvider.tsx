import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AlertOptions, ConfirmOptions, DialogApi, PromptOptions } from './types.js'
import { DialogShell } from './DialogShell.js'
import { DialogButton } from './DialogButton.js'

/**
 * App-wide custom dialog system (#158). Replaces window.alert /
 * window.confirm / window.prompt with promise-returning primitives
 * built on Radix Dialog, themed with v3 tokens.
 *
 * Mount <DialogProvider> once near the app root; call sites read the
 * API with useDialogs() and await whichever variant they need:
 *
 *   const { confirm } = useDialogs()
 *   if (await confirm({ title: 'Discard?', message: '...' })) { ... }
 *
 * Only one dialog is on screen at a time (matches native semantics);
 * stacking is intentionally unsupported.
 */

type AlertState = { kind: 'alert'; opts: AlertOptions; resolve: () => void }
type ConfirmState = { kind: 'confirm'; opts: ConfirmOptions; resolve: (ok: boolean) => void }
type PromptState = { kind: 'prompt'; opts: PromptOptions; resolve: (v: string | null) => void }
type ActiveDialog = AlertState | ConfirmState | PromptState | null

const DialogContext = createContext<DialogApi | null>(null)

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs() must be called inside <DialogProvider>')
  return ctx
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog>(null)

  const api = useMemo<DialogApi>(
    () => ({
      alert: (opts) =>
        new Promise<void>((resolve) => {
          setActive({ kind: 'alert', opts, resolve })
        }),
      confirm: (opts) =>
        new Promise<boolean>((resolve) => {
          setActive({ kind: 'confirm', opts, resolve })
        }),
      prompt: (opts) =>
        new Promise<string | null>((resolve) => {
          setActive({ kind: 'prompt', opts, resolve })
        }),
    }),
    [],
  )

  const close = useCallback(() => setActive(null), [])

  return (
    <DialogContext.Provider value={api}>
      {children}
      {active?.kind === 'alert' && <AlertView state={active} onClose={close} />}
      {active?.kind === 'confirm' && <ConfirmView state={active} onClose={close} />}
      {active?.kind === 'prompt' && <PromptView state={active} onClose={close} />}
    </DialogContext.Provider>
  )
}

function AlertView({ state, onClose }: { state: AlertState; onClose: () => void }) {
  const { opts, resolve } = state
  function ok() {
    resolve()
    onClose()
  }
  return (
    <DialogShell
      open
      onOpenChange={(o) => {
        if (!o) ok()
      }}
      title={opts.title}
      accent={opts.variant ?? 'info'}
      testid="dialog-alert"
      actions={
        <DialogButton variant="primary" onClick={ok} autoFocus testid="dialog-alert-ok">
          {opts.okLabel ?? 'OK'}
        </DialogButton>
      }
    >
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-md)',
          lineHeight: 'var(--leading-relaxed)',
          color: 'var(--text-secondary)',
          // `pre-line` honours `\n` in the message string (so the
          // keyboard-shortcut dump renders one line per binding) and
          // still wraps long lines.
          whiteSpace: 'pre-line',
        }}
      >
        {opts.message}
      </p>
    </DialogShell>
  )
}

function ConfirmView({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const { opts, resolve } = state
  function pick(ok: boolean) {
    resolve(ok)
    onClose()
  }
  return (
    <DialogShell
      open
      onOpenChange={(o) => {
        if (!o) pick(false)
      }}
      title={opts.title}
      accent={opts.destructive ? 'danger' : 'info'}
      testid="dialog-confirm"
      actions={
        <>
          <DialogButton onClick={() => pick(false)} testid="dialog-confirm-cancel">
            {opts.cancelLabel ?? 'Cancel'}
          </DialogButton>
          <DialogButton
            variant={opts.destructive ? 'danger' : 'primary'}
            onClick={() => pick(true)}
            autoFocus
            testid="dialog-confirm-ok"
          >
            {opts.confirmLabel ?? 'Confirm'}
          </DialogButton>
        </>
      }
    >
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-md)',
          lineHeight: 'var(--leading-relaxed)',
          color: 'var(--text-secondary)',
          // `pre-line` honours `\n` in the message string (so the
          // keyboard-shortcut dump renders one line per binding) and
          // still wraps long lines.
          whiteSpace: 'pre-line',
        }}
      >
        {opts.message}
      </p>
    </DialogShell>
  )
}

function PromptView({ state, onClose }: { state: PromptState; onClose: () => void }) {
  const { opts, resolve } = state
  const [value, setValue] = useState(opts.defaultValue ?? '')
  const error = opts.validate?.(value) ?? null
  function submit() {
    if (error) return
    resolve(value)
    onClose()
  }
  function cancel() {
    resolve(null)
    onClose()
  }
  return (
    <DialogShell
      open
      onOpenChange={(o) => {
        if (!o) cancel()
      }}
      title={opts.title}
      testid="dialog-prompt"
      actions={
        <>
          <DialogButton onClick={cancel} testid="dialog-prompt-cancel">
            {opts.cancelLabel ?? 'Cancel'}
          </DialogButton>
          <DialogButton
            variant="primary"
            onClick={submit}
            disabled={!!error}
            testid="dialog-prompt-ok"
          >
            {opts.okLabel ?? 'OK'}
          </DialogButton>
        </>
      }
    >
      {opts.message && (
        <p
          style={{
            margin: 0,
            marginBottom: 'var(--space-3)',
            fontSize: 'var(--text-md)',
            color: 'var(--text-secondary)',
          }}
        >
          {opts.message}
        </p>
      )}
      {opts.label && (
        <label
          htmlFor="dialog-prompt-input"
          style={{
            display: 'block',
            marginBottom: 'var(--space-1)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--text-secondary)',
          }}
        >
          {opts.label}
        </label>
      )}
      <input
        id="dialog-prompt-input"
        data-testid="dialog-prompt-input"
        autoFocus
        value={value}
        placeholder={opts.placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
        style={{
          width: '100%',
          height: 'var(--control-height-lg)',
          padding: '0 10px',
          fontSize: 'var(--text-md)',
          border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />
      {error && (
        <p
          data-testid="dialog-prompt-error"
          style={{
            margin: 0,
            marginTop: 'var(--space-1)',
            fontSize: 'var(--text-sm)',
            color: 'var(--error)',
          }}
        >
          {error}
        </p>
      )}
    </DialogShell>
  )
}
