/**
 * GH #79 — `tryParseInputJson` is the parsing primitive behind
 * `useEffectivePreviewData`. The hook itself is just a `useMemo` /
 * `useRef` wrapper around this function; the interesting behaviour
 * (valid → return; invalid JSON → null; non-object → null; partial
 * shape → defaulted) lives here.
 */
import { describe, it, expect } from 'vitest'
import { tryParseInputJson } from '../useEffectivePreviewData'

describe('tryParseInputJson', () => {
  it('returns null for invalid JSON (mid-edit fallback path)', () => {
    expect(tryParseInputJson('{ "texts": {')).toBeNull()
    expect(tryParseInputJson('not json at all')).toBeNull()
  })

  it('returns null for parsed non-object values', () => {
    expect(tryParseInputJson('"a string"')).toBeNull()
    expect(tryParseInputJson('42')).toBeNull()
    expect(tryParseInputJson('null')).toBeNull()
    expect(tryParseInputJson('[1, 2, 3]')).toBeNull()
  })

  it('returns the parsed object with all three buckets present', () => {
    const parsed = tryParseInputJson(
      '{ "texts": { "name": "Jane" }, "tables": { "subjects": [{ "k": "v" }] }, "images": {} }',
    )
    expect(parsed).not.toBeNull()
    expect(parsed?.texts).toEqual({ name: 'Jane' })
    expect(parsed?.tables).toEqual({ subjects: [{ k: 'v' }] })
    expect(parsed?.images).toEqual({})
  })

  it('defaults missing buckets to {} (partial input is accepted)', () => {
    const parsed = tryParseInputJson('{ "texts": { "title": "Hi" } }')
    expect(parsed).not.toBeNull()
    expect(parsed?.texts).toEqual({ title: 'Hi' })
    expect(parsed?.tables).toEqual({})
    expect(parsed?.images).toEqual({})
  })

  it('discards non-object bucket values (e.g. `"texts": "string"`)', () => {
    const parsed = tryParseInputJson('{ "texts": "oops", "tables": [1, 2] }')
    expect(parsed).not.toBeNull()
    expect(parsed?.texts).toEqual({})
    expect(parsed?.tables).toEqual({})
  })
})
