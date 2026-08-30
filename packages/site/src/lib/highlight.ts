/**
 * Tiny, dependency-free syntax tokenizer for the code blocks. Splits a
 * snippet into typed tokens (keyword, string, comment, number, function call,
 * punctuation, plain) which `CodeBlock` renders as coloured spans. Deliberately
 * not a full parser — just enough to make TS/JS/JSON/shell readable, with zero
 * bundle cost from a highlighting library.
 */
export type TokenType = 'comment' | 'string' | 'keyword' | 'number' | 'fn' | 'punct' | 'plain'

export interface Token {
  type: TokenType
  value: string
}

const KEYWORDS = new Set([
  'import',
  'from',
  'export',
  'default',
  'const',
  'let',
  'var',
  'await',
  'async',
  'function',
  'return',
  'new',
  'if',
  'else',
  'for',
  'of',
  'in',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'type',
  'interface',
  'extends',
  'implements',
  'class',
  'try',
  'catch',
  'finally',
  'throw',
  'typeof',
  'instanceof',
  'void',
  'as',
  'this',
  'true',
  'false',
  'null',
  'undefined',
  'yield',
])

/** Split `code` into coloured tokens. `lang` picks the comment style. */
export function tokenize(code: string, lang = 'ts'): Token[] {
  if (lang === 'text') return [{ type: 'plain', value: code }]
  const isShell = lang === 'bash' || lang === 'shell' || lang === 'sh'
  const comment = isShell ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/'
  const re = new RegExp(
    `(${comment})` + // 1: comment
      '|(`(?:\\\\.|[^`\\\\])*`|\'(?:\\\\.|[^\'\\\\])*\'|"(?:\\\\.|[^"\\\\])*")' + // 2: string
      '|(\\b\\d[\\d_]*(?:\\.\\d+)?\\b)' + // 3: number
      '|([A-Za-z_$][\\w$]*)' + // 4: identifier
      '|(\\s+)' + // 5: whitespace
      '|([\\s\\S])', // 6: any other single char (punctuation)
    'g',
  )
  const tokens: Token[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    if (m[1] !== undefined) tokens.push({ type: 'comment', value: m[1] })
    else if (m[2] !== undefined) tokens.push({ type: 'string', value: m[2] })
    else if (m[3] !== undefined) tokens.push({ type: 'number', value: m[3] })
    else if (m[4] !== undefined) {
      const id = m[4]
      if (!isShell && KEYWORDS.has(id)) {
        tokens.push({ type: 'keyword', value: id })
      } else if (!isShell && /^\s*\(/.test(code.slice(re.lastIndex))) {
        tokens.push({ type: 'fn', value: id }) // identifier immediately before "(" → call
      } else {
        tokens.push({ type: 'plain', value: id })
      }
    } else if (m[5] !== undefined) tokens.push({ type: 'plain', value: m[5] })
    else tokens.push({ type: 'punct', value: m[0] })
  }
  return tokens
}

/** CSS class for a token type (`plain` gets none — it inherits). */
export function tokenClass(type: TokenType): string | undefined {
  switch (type) {
    case 'comment':
      return 'tok-com'
    case 'string':
      return 'tok-str'
    case 'keyword':
      return 'tok-key'
    case 'number':
      return 'tok-num'
    case 'fn':
      return 'tok-fn'
    case 'punct':
      return 'tok-punct'
    default:
      return undefined
  }
}
