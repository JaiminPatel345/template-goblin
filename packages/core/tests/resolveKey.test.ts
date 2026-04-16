import { resolveKey } from '../src/utils/resolveKey.js'

describe('resolveKey', () => {
  it('should resolve a simple key', () => {
    expect(resolveKey({ a: 1 }, 'a')).toBe(1)
  })

  it('should resolve a nested key', () => {
    expect(resolveKey({ a: { b: 2 } }, 'a.b')).toBe(2)
  })

  it('should return undefined for a missing key', () => {
    expect(resolveKey({ a: 1 }, 'b')).toBeUndefined()
  })

  it('should resolve deep nesting', () => {
    const data = { a: { b: { c: { d: 42 } } } }
    expect(resolveKey(data, 'a.b.c.d')).toBe(42)
  })

  it('should return undefined for empty string key', () => {
    expect(resolveKey({ a: 1 }, '')).toBeUndefined()
  })

  it('should return undefined for __proto__ key (prototype pollution protection)', () => {
    expect(resolveKey({}, '__proto__')).toBeUndefined()
  })

  it('should return undefined for constructor key (prototype pollution protection)', () => {
    expect(resolveKey({}, 'constructor')).toBeUndefined()
  })

  it('should return undefined for prototype key (prototype pollution protection)', () => {
    expect(resolveKey({}, 'prototype')).toBeUndefined()
  })

  it('should return undefined when intermediate value is not an object', () => {
    expect(resolveKey({ a: 'string' }, 'a.b')).toBeUndefined()
  })

  it('should return undefined when data is null', () => {
    expect(resolveKey(null as unknown as Record<string, unknown>, 'a')).toBeUndefined()
  })
})
