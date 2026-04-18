/**
 * QA: verify the core `utils/safeKey.ts` re-exports the SAME `isSafeKey`
 * function reference from `@template-goblin/types`, not a shadow/copy.
 *
 * A type-only re-export (`export type { isSafeKey }`) would have compiled to
 * nothing in JS, breaking core's runtime imports. A divergent implementation
 * would silently allow keys in one package that the other package rejects.
 */
import { describe, it, expect } from '@jest/globals'
import { isSafeKey as coreSafe } from '../src/utils/safeKey.js'
import { isSafeKey as typesSafe } from '@template-goblin/types'

describe('safeKey re-export from @template-goblin/types', () => {
  it('core utils/safeKey.ts re-exports the exact same function reference', () => {
    expect(coreSafe).toBe(typesSafe)
  })

  it('both identify dangerous keys', () => {
    for (const bad of [
      '__proto__',
      'constructor',
      'prototype',
      'hasOwnProperty',
      'toString',
      'valueOf',
    ]) {
      expect(coreSafe(bad)).toBe(false)
      expect(typesSafe(bad)).toBe(false)
    }
  })

  it('both identify safe keys', () => {
    for (const good of ['name', 'user_name', 'a1', 'x_y_z']) {
      expect(coreSafe(good)).toBe(true)
      expect(typesSafe(good)).toBe(true)
    }
  })
})
