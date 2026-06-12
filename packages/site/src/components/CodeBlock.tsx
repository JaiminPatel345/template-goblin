import { useMemo, useState } from 'react'
import { tokenize, tokenClass } from '../lib/highlight'

/**
 * A code block with a window-style header, optional filename, and a
 * copy-to-clipboard button. Syntax-highlighted with a tiny in-house tokenizer
 * (see `lib/highlight`) — coloured spans, no highlighter dependency.
 */
export function CodeBlock({
  code,
  file,
  lang = 'ts',
}: {
  code: string
  file?: string
  lang?: string
}) {
  const [copied, setCopied] = useState(false)
  const tokens = useMemo(() => tokenize(code, lang), [code, lang])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked (insecure context / permissions) — no-op.
    }
  }

  return (
    <div className="code">
      <div className="code-bar">
        <span className="code-dot" />
        <span className="code-dot" />
        <span className="code-dot" />
        <span className="code-file">{file ?? lang}</span>
        <button className="code-copy" onClick={copy} type="button" aria-label="Copy code">
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre>
        <code>
          {tokens.map((t, i) => {
            const cls = tokenClass(t.type)
            return cls ? (
              <span key={i} className={cls}>
                {t.value}
              </span>
            ) : (
              t.value
            )
          })}
        </code>
      </pre>
    </div>
  )
}
