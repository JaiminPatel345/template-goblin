/**
 * GH #81 — solid-colour image marker parser.
 *
 * Designers can pass `<STATICIMAGE_COLOR_#hex>` in the dynamic
 * `images.<key>` slot to paint the rect that colour. The marker is
 * case-sensitive on the prefix; the hex tail accepts 3- or 6-digit forms.
 */
import {
  parseImageColorMarker,
  isImageColorMarker,
  makeImageColorMarker,
} from '../src/utils/imageColorMarker.js'

describe('parseImageColorMarker', () => {
  it('extracts a 6-digit hex colour', () => {
    expect(parseImageColorMarker('<STATICIMAGE_COLOR_#ff0080>')).toBe('#ff0080')
  })

  it('extracts a 3-digit hex colour', () => {
    expect(parseImageColorMarker('<STATICIMAGE_COLOR_#abc>')).toBe('#abc')
  })

  it('accepts uppercase hex digits', () => {
    expect(parseImageColorMarker('<STATICIMAGE_COLOR_#FFAA00>')).toBe('#FFAA00')
  })

  it('returns null for non-string input', () => {
    expect(parseImageColorMarker(undefined)).toBeNull()
    expect(parseImageColorMarker(null)).toBeNull()
    expect(parseImageColorMarker(42)).toBeNull()
    expect(parseImageColorMarker({ color: '#ff0000' })).toBeNull()
  })

  it('case-sensitive on the prefix — lowercase variants do not match', () => {
    expect(parseImageColorMarker('<staticimage_color_#fff>')).toBeNull()
    expect(parseImageColorMarker('<StaticImage_Color_#fff>')).toBeNull()
  })

  it('rejects malformed hex (too short, too long, no #)', () => {
    expect(parseImageColorMarker('<STATICIMAGE_COLOR_#ff>')).toBeNull()
    expect(parseImageColorMarker('<STATICIMAGE_COLOR_#ff00ff00>')).toBeNull()
    expect(parseImageColorMarker('<STATICIMAGE_COLOR_ff0000>')).toBeNull()
  })

  it('rejects strings that merely contain the marker', () => {
    expect(parseImageColorMarker('prefix <STATICIMAGE_COLOR_#fff>')).toBeNull()
    expect(parseImageColorMarker('<STATICIMAGE_COLOR_#fff> suffix')).toBeNull()
  })

  it('isImageColorMarker matches parseImageColorMarker', () => {
    expect(isImageColorMarker('<STATICIMAGE_COLOR_#abc>')).toBe(true)
    expect(isImageColorMarker('not a marker')).toBe(false)
  })

  it('makeImageColorMarker round-trips through the parser', () => {
    const marker = makeImageColorMarker('#1a2b3c')
    expect(marker).toBe('<STATICIMAGE_COLOR_#1a2b3c>')
    expect(parseImageColorMarker(marker)).toBe('#1a2b3c')
  })
})
