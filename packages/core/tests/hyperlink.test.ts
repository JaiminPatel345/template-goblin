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
    expect(isValidHyperlinkUrl([])).toBe(false)
    expect(isValidHyperlinkUrl(true)).toBe(false)
    expect(isValidHyperlinkUrl(NaN)).toBe(false)
  })

  it('rejects strings of only whitespace', () => {
    expect(isValidHyperlinkUrl(' ')).toBe(false)
    expect(isValidHyperlinkUrl('\t\n')).toBe(false)
    expect(isValidHyperlinkUrl('   \r\n  ')).toBe(false)
  })

  describe('case sensitivity', () => {
    // Browsers normalise scheme to lowercase, so an uppercase or mixed-case
    // scheme should still be accepted via the allowlist.
    it.each([
      ['HTTPS', 'HTTPS://example.com'],
      ['HtTp', 'HtTp://example.com'],
      ['MailTo', 'MailTo:foo@example.com'],
      ['TEL', 'TEL:+15551234'],
    ])('accepts %s scheme (case-insensitive)', (_label, url) => {
      expect(isValidHyperlinkUrl(url)).toBe(true)
    })
  })

  describe('schemes that look similar but are not allowed', () => {
    it.each([
      ['https typo', 'httpz://example.com'],
      ['ws', 'ws://example.com'],
      ['wss', 'wss://example.com'],
      ['blob', 'blob:https://example.com/abc'],
      ['chrome-extension', 'chrome-extension://abc/popup.html'],
    ])('rejects %s', (_label, url) => {
      expect(isValidHyperlinkUrl(url)).toBe(false)
    })
  })

  describe('URLs with extra components', () => {
    it.each([
      ['userinfo', 'https://user:pass@example.com/'],
      ['unicode hostname', 'https://例え.jp/'],
      ['punycode hostname', 'https://xn--r8jz45g.jp/'],
      ['IPv4 host', 'http://192.168.0.1:8080/'],
      ['port + query + fragment', 'https://example.com:8443/path?a=1&b=2#section'],
      ['mailto with subject', 'mailto:foo@example.com?subject=Hi'],
      ['tel with extension', 'tel:+15551234,9999'],
    ])('accepts %s', (_label, url) => {
      expect(isValidHyperlinkUrl(url)).toBe(true)
    })
  })

  describe('edge degenerate URLs', () => {
    // `new URL` is forgiving — these shapes parse successfully even if a
    // human would call them malformed. We accept them because the
    // protocol allowlist passes; UX-level fitness is the user's concern.
    it('accepts empty mailto / tel paths (parser tolerates)', () => {
      expect(isValidHyperlinkUrl('mailto:')).toBe(true)
      expect(isValidHyperlinkUrl('tel:')).toBe(true)
    })

    it('rejects bare scheme with no body for http(s)', () => {
      // `https:` alone is malformed (no host) and `new URL` throws.
      expect(isValidHyperlinkUrl('https:')).toBe(false)
      expect(isValidHyperlinkUrl('http:')).toBe(false)
    })

    it('rejects scheme followed by garbage', () => {
      expect(isValidHyperlinkUrl('https//example.com')).toBe(false)
      expect(isValidHyperlinkUrl(':https://example.com')).toBe(false)
    })
  })
})
