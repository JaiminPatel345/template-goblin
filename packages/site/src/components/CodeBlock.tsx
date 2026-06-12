import { useState } from 'react'

/**
 * A code block with a window-style header, optional filename, and a
 * copy-to-clipboard button. Plain monospace rendering — deliberately no
 * syntax-highlighter dependency (keeps the bundle tiny for Lighthouse).
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
        <code>{code}</code>
      </pre>
    </div>
  )
}
