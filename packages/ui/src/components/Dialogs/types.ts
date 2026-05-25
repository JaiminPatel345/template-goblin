/**
 * Shared types for the v3 dialog system (#158). One primitive per
 * native browser dialog the app used to call — alert / confirm /
 * prompt — exposed via a single \`useDialogs()\` hook that returns a
 * promise-bearing API so call-sites stay readable.
 */

export interface AlertOptions {
  /** Headline shown at the top of the dialog. */
  title: string
  /** Body copy. Required — alerts without context shouldn't fire. */
  message: string
  /** Label for the dismiss button. Defaults to 'OK'. */
  okLabel?: string
  /** Intent — drives the icon + colour. Defaults to 'info'. */
  variant?: 'info' | 'success' | 'warning' | 'danger'
}

export interface ConfirmOptions {
  title: string
  message: string
  /** Confirm button label. Defaults to 'Confirm'. */
  confirmLabel?: string
  /** Cancel button label. Defaults to 'Cancel'. */
  cancelLabel?: string
  /** When true, the confirm button paints in the danger colour. */
  destructive?: boolean
}

export interface PromptOptions {
  title: string
  /** Label shown above the input. */
  label?: string
  /** Helper / clarifying body copy. */
  message?: string
  /** Placeholder text inside the input. */
  placeholder?: string
  /** Pre-filled value. */
  defaultValue?: string
  /** Confirm button label. Defaults to 'OK'. */
  okLabel?: string
  cancelLabel?: string
  /**
   * Synchronous validator. Return a non-empty string to surface as an
   * inline error and disable confirm; return null/undefined when valid.
   */
  validate?: (value: string) => string | null | undefined
}

/** Imperative API surfaced by \`useDialogs()\`. Each call returns a
 *  Promise; the promise resolves with the user's choice and never
 *  rejects (Esc / overlay click / explicit cancel all resolve cleanly). */
export interface DialogApi {
  /** Resolves once the user dismisses the alert. */
  alert: (opts: AlertOptions) => Promise<void>
  /** Resolves \`true\` on confirm, \`false\` on cancel / dismiss. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  /** Resolves with the input value on confirm, \`null\` on cancel /
   *  dismiss. Whitespace is preserved — the caller decides whether to
   *  trim. */
  prompt: (opts: PromptOptions) => Promise<string | null>
}
