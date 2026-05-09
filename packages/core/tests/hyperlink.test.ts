/**
 * Unit coverage for `isValidHyperlinkUrl` (#87).
 *
 * Re-exported from `@template-goblin/types`; exercised here via the same
 * public surface the SDK consumers see.
 */
import { isValidHyperlinkUrl } from '@template-goblin/types'

describe('isValidHyperlinkUrl', () => {
  describe.each([
    ['https URL', 'https://example.com'],
    ['https with path', 'https://example.com/path?q=1#frag'],
    ['http URL', 'http://localhost:3000'],
    ['mailto', 'mailto:hello@example.com'],
    ['tel', 'tel:+15551234567'],
  ])('accepts %s', (_label, url) => {
    it('passes', () => {
      expect(isValidHyperlinkUrl(url)).toBe(true)
    })
  })

  describe.each([
    ['empty string', ''],
    ['plain text', 'just some text'],
    ['ftp scheme', 'ftp://files.example.com'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data URI', 'data:text/plain,hello'],
    ['file scheme', 'file:///etc/passwd'],
    ['custom scheme', 'goblinapp://open'],
  ])('rejects %s', (_label, url) => {
    it('returns false', () => {
      expect(isValidHyperlinkUrl(url)).toBe(false)
    })
  })

  it('rejects non-string values', () => {
    expect(isValidHyperlinkUrl(undefined)).toBe(false)
    expect(isValidHyperlinkUrl(null)).toBe(false)
    expect(isValidHyperlinkUrl(42)).toBe(false)
    expect(isValidHyperlinkUrl({})).toBe(false)
  })
})
