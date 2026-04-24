import { describe, it, expect, vi } from 'vitest'
import { generateSecureId } from '../id.js'

describe('generateSecureId', () => {
  it('should generate a string starting with the given prefix', () => {
    const id = generateSecureId('test-')
    expect(id).toMatch(/^test-/)
  })

  it('should use crypto.randomUUID', () => {
    const spy = vi.spyOn(crypto, 'randomUUID')
    generateSecureId()
    expect(spy).toHaveBeenCalled()
  })

  it('should generate unique IDs', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSecureId())
    }
    expect(ids.size).toBe(100)
  })
})
