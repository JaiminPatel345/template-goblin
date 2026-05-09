import { describe, it, expect } from 'vitest'
import { formatJsonString, FORMAT_ERROR_MESSAGE } from '../formatJson.js'

describe('formatJsonString', () => {
  it('pretty-prints a valid object with 2-space indentation', () => {
    const r = formatJsonString('{"texts":{"a":"x"},"tables":{}}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.text).toBe('{\n  "texts": {\n    "a": "x"\n  },\n  "tables": {}\n}')
    }
  })

  it('reformats already-pretty input idempotently', () => {
    const pretty = '{\n  "n": 1\n}'
    const r = formatJsonString(pretty)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe(pretty)
  })

  it('handles a top-level array', () => {
    const r = formatJsonString('[1,2,3]')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('[\n  1,\n  2,\n  3\n]')
  })

  it('returns a stable error on malformed JSON', () => {
    const r = formatJsonString('{not valid}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(FORMAT_ERROR_MESSAGE)
  })

  it('returns the error on an empty string', () => {
    const r = formatJsonString('')
    expect(r.ok).toBe(false)
  })

  it('does not mutate the caller — failure leaves the input alone (no-op contract)', () => {
    // Function is pure; this just locks the contract: failure never returns
    // a `text` field, so the caller can't accidentally overwrite the
    // textarea with the error string.
    const r = formatJsonString('{"a":')
    expect(r.ok).toBe(false)
    expect('text' in r).toBe(false)
  })
})
