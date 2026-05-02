/**
 * Auto-select-all when an input inside a scoped container gains focus.
 *
 * Wired by `useSelectAllOnFocus(ref)` on the right-panel scroll root in
 * `App.tsx`. Uses the native `focusin` event (which bubbles, unlike
 * `focus`) so we catch focus events from any descendant input/textarea.
 * React's synthetic `onFocus` *does* bubble in modern React, but a native
 * listener is unambiguous and survives portal/strict-mode quirks — same
 * UX whether the user clicks or tabs in.
 *
 * The `select()` is deferred via `setTimeout(0)` so the click's mouseup
 * doesn't position the caret over the selection. We also bail when the
 * input already has a manually-dragged selection (start !== end at
 * deferred time) — that preserves user-drag selections.
 *
 * Skipped element types: `color`, `file`, `range`, `checkbox`, `radio`,
 * `button`, `submit`, `reset`, `image` — `select()` is meaningless or
 * actively wrong on these.
 */
import { useEffect } from 'react'

const SKIP_INPUT_TYPES = new Set([
  'color',
  'file',
  'range',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'image',
])

function handleFocusIn(target: EventTarget | null): void {
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
    return
  }
  if (target instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(target.type)) {
    return
  }
  setTimeout(() => {
    if (document.activeElement !== target) return
    if (target.selectionStart !== target.selectionEnd) return
    try {
      target.select()
    } catch {
      // Some input types (e.g. number on Safari) throw on .select() —
      // safe to swallow; the user just doesn't get auto-select there.
    }
  }, 0)
}

/**
 * Attach a `focusin` listener to a scoped element. Pass a state-backed
 * element (via callback ref) so the effect re-runs when the element
 * mounts — `useRef` won't trigger this since the ref OBJECT is stable
 * even when its `.current` populates after first paint, and the right
 * panel mounts conditionally after onboarding.
 */
export function useSelectAllOnFocus(el: HTMLElement | null): void {
  useEffect(() => {
    if (!el) return
    function listener(e: FocusEvent) {
      handleFocusIn(e.target)
    }
    el.addEventListener('focusin', listener)
    return () => el.removeEventListener('focusin', listener)
  }, [el])
}
