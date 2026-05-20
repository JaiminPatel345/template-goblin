/**
 * Unit tests for the page-number formatter helpers (#61).
 *
 * Lives in `core/tests/` because the renderer consumes these helpers; the
 * `@template-goblin/types` package doesn't carry its own test runner.
 */
import { toRoman, formatPageNumber, defaultPageNumberConfig } from '@template-goblin/types'

describe('toRoman', () => {
  it.each([
    [1, 'I'],
    [4, 'IV'],
    [9, 'IX'],
    [40, 'XL'],
    [90, 'XC'],
    [400, 'CD'],
    [900, 'CM'],
    [1994, 'MCMXCIV'],
    [3999, 'MMMCMXCIX'],
  ])('converts %i to %s', (n, want) => {
    expect(toRoman(n)).toBe(want)
  })

  it('falls back to arabic on out-of-range / non-integer / non-finite', () => {
    expect(toRoman(0)).toBe('0')
    expect(toRoman(-3)).toBe('-3')
    expect(toRoman(4000)).toBe('4000')
    expect(toRoman(1.5)).toBe('1.5')
    expect(toRoman(Number.NaN)).toBe('NaN')
  })
})

describe('formatPageNumber', () => {
  it('renders arabic numerals as plain strings', () => {
    expect(formatPageNumber(1, 'arabic')).toBe('1')
    expect(formatPageNumber(42, 'arabic')).toBe('42')
  })

  it('renders roman numerals upper-case', () => {
    expect(formatPageNumber(1, 'roman')).toBe('I')
    expect(formatPageNumber(7, 'roman')).toBe('VII')
  })
})

describe('defaultPageNumberConfig', () => {
  it('produces a fully-populated, opt-in config', () => {
    const c = defaultPageNumberConfig()
    expect(c.enabled).toBe(true)
    expect(c.placement).toBe('footer')
    expect(c.align).toBe('center')
    expect(c.numeralStyle).toBe('arabic')
    expect(c.showOnFirstPage).toBe(true)
    expect(c.fontFamily).toBeTruthy()
    expect(c.fontSize).toBeGreaterThan(0)
  })
})
