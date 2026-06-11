/**
 * Canvas ⇄ PDF text-wrap parity (#91).
 *
 * `wrapToLines` must mirror `core/src/utils/measure.ts#wrapText`
 * line-for-line: paragraphs split on `\n` first, over-wide words break
 * mid-word. These cases are the exact divergences the QA sweep found —
 * the old canvas wrapper collapsed `\n` into spaces and admitted
 * over-wide words whole.
 *
 * The fake context measures 10px per character, making expected line
 * splits exact and font-independent (the algorithm under test is pure
 * given a measurer).
 */
import { describe, it, expect } from 'vitest'
import { wrapToLines } from '../textMeasure.js'

const ctx = {
  measureText: (s: string) => ({ width: s.length * 10 }) as TextMetrics,
}

describe('wrapToLines mirrors core wrapText', () => {
  it('splits paragraphs on \\n before word-wrapping', () => {
    // 200px = 20 chars per line; both paragraphs fit on one line each.
    expect(wrapToLines(ctx, 'Line one\nLine two', 200)).toEqual(['Line one', 'Line two'])
  })

  it('preserves empty lines from consecutive newlines', () => {
    expect(wrapToLines(ctx, 'a\n\nb', 200)).toEqual(['a', '', 'b'])
  })

  it('breaks a single over-wide word mid-word (URLs)', () => {
    // 50px = 5 chars per fragment.
    expect(wrapToLines(ctx, 'abcdefghij', 50)).toEqual(['abcde', 'fghij'])
  })

  it('breaks an over-wide word that follows normal words', () => {
    // 50px = 5 chars: "ab cd" fits one line, then the long word fragments.
    expect(wrapToLines(ctx, 'ab cd abcdefghij', 50)).toEqual(['ab cd', 'abcde', 'fghij'])
  })

  it('wraps ordinary text on word boundaries', () => {
    // 70px = 7 chars.
    expect(wrapToLines(ctx, 'one two three', 70)).toEqual(['one two', 'three'])
  })

  it('empty text yields a single empty line', () => {
    expect(wrapToLines(ctx, '', 100)).toEqual([''])
  })
})
