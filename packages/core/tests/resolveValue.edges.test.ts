/**
 * QA coverage — `resolveValue` additional scenarios (spec §6.1).
 *
 *   - Static-table resolution ignores any bucket collision in InputJSON.
 *   - Optional dynamic field with an entirely missing bucket returns
 *     `undefined` and never throws (belt-and-braces check using `as unknown`
 *     to bypass the type-level invariant).
 */

import type {
  ImageField,
  ImageFieldStyle,
  InputJSON,
  TableField,
  TableFieldStyle,
  TextField,
  TextFieldStyle,
} from '@template-goblin/types'
import { resolveValue } from '../src/utils/resolveValue.js'

const stubTextStyle = {} as TextFieldStyle
const stubImageStyle: ImageFieldStyle = { fit: 'contain' }
const stubTableStyle = {
  columns: [{ key: 'a', label: 'a', width: 1, style: null, headerStyle: null }],
} as unknown as TableFieldStyle

function textField(source: TextField['source']): TextField {
  return {
    id: 't',
    type: 'text',
    label: 'T',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    zIndex: 0,
    style: stubTextStyle,
    source,
  }
}

function imageField(source: ImageField['source']): ImageField {
  return {
    id: 'i',
    type: 'image',
    label: 'I',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    zIndex: 0,
    style: stubImageStyle,
    source,
  }
}

function tableField(source: TableField['source']): TableField {
  return {
    id: 'tb',
    type: 'table',
    label: 'Tab',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 400,
    height: 200,
    zIndex: 0,
    style: stubTableStyle,
    source,
  }
}

describe('resolveValue — additional edge cases', () => {
  it('static table returns baked-in rows even when InputJSON.tables has a bucket collision', () => {
    const bakedIn = [{ a: 'baked' }]
    const intruder = [{ a: 'intruder' }]
    const field = tableField({ mode: 'static', value: bakedIn })
    // Even if the consumer accidentally places rows under a key that would
    // match a dynamic field, the static value must win.
    const input: InputJSON = {
      texts: {},
      images: {},
      tables: { anything: intruder, whatever: intruder },
    }
    expect(resolveValue(field, input)).toBe(bakedIn)
  })

  it('optional dynamic text field with missing bucket returns undefined (no throw)', () => {
    const field = textField({
      mode: 'dynamic',
      jsonKey: 'greeting',
      required: false,
      placeholder: null,
    })
    // Simulate an InputJSON whose buckets were not fully populated by the caller.
    const skimpy = { texts: {} } as unknown as InputJSON
    expect(() => resolveValue(field, skimpy)).not.toThrow()
    expect(resolveValue(field, skimpy)).toBeUndefined()
  })

  /*
   * TODO: PRODUCT BUG — see QA report
   *
   * When `InputJSON` is missing a bucket entirely (e.g. caller passes
   * `{ texts: {} }` only), `resolveValue` currently dereferences the missing
   * bucket (`input.images[key]`) and throws `TypeError: Cannot read
   * properties of undefined`. The TypeScript type makes all three buckets
   * required, so this is only reachable from JavaScript callers or when the
   * caller casts. The spec's "returns `undefined` when absent" suggests we
   * should defensively fall back. Tests below pin current behaviour with
   * `toThrow` so the fix will RED-flag here and prompt a spec decision.
   */
  it('optional dynamic image field with missing images bucket — CURRENTLY THROWS (documents current behaviour)', () => {
    const field = imageField({
      mode: 'dynamic',
      jsonKey: 'logo',
      required: false,
      placeholder: null,
    })
    const skimpy = { texts: {} } as unknown as InputJSON
    expect(() => resolveValue(field, skimpy)).toThrow()
  })

  it('optional dynamic table field with missing tables bucket — CURRENTLY THROWS (documents current behaviour)', () => {
    const field = tableField({
      mode: 'dynamic',
      jsonKey: 'rows',
      required: false,
      placeholder: null,
    })
    const skimpy = { texts: {} } as unknown as InputJSON
    expect(() => resolveValue(field, skimpy)).toThrow()
  })

  it('static text returns empty string as-is (not undefined)', () => {
    const field = textField({ mode: 'static', value: '' })
    expect(resolveValue(field, { texts: {}, images: {}, tables: {} })).toBe('')
  })

  it('static table returns empty array as-is (not undefined)', () => {
    const field = tableField({ mode: 'static', value: [] })
    const out = resolveValue(field, { texts: {}, images: {}, tables: {} })
    expect(Array.isArray(out)).toBe(true)
    expect(out).toHaveLength(0)
  })
})
