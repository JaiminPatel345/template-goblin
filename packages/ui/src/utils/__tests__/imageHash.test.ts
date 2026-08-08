import { describe, it, expect } from 'vitest'
import { computeBufferHash, findDuplicateBackground } from '../imageHash.js'
import type { PageDefinition } from '@template-goblin/types'

describe('imageHash deduplication', () => {
  it('computes identical hashes for identical ArrayBuffers', async () => {
    const buf1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
    const buf2 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
    const buf3 = new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]).buffer

    const hash1 = await computeBufferHash(buf1)
    const hash2 = await computeBufferHash(buf2)
    const hash3 = await computeBufferHash(buf3)

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
  })

  it('finds existing duplicate background image by hash', async () => {
    const buf1 = new Uint8Array([10, 20, 30, 40]).buffer
    const buf2 = new Uint8Array([10, 20, 30, 40]).buffer
    const buf3 = new Uint8Array([99, 99, 99, 99]).buffer

    const pages: PageDefinition[] = [
      {
        id: 'page-1',
        index: 0,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/page-1.png',
        width: 595,
        height: 842,
        pageSize: 'A4',
      },
    ]

    const pageBackgroundBuffers = new Map<string, ArrayBuffer>()
    pageBackgroundBuffers.set('page-1', buf1)

    const pageBackgroundDataUrls = new Map<string, string>()
    pageBackgroundDataUrls.set('page-1', 'data:image/png;base64,AAA')

    // Matching buffer should return existing background metadata
    const match = await findDuplicateBackground(
      buf2,
      pages,
      pageBackgroundBuffers,
      pageBackgroundDataUrls,
    )
    expect(match).not.toBeNull()
    expect(match?.filename).toBe('backgrounds/page-1.png')
    expect(match?.dataUrl).toBe('data:image/png;base64,AAA')

    // Different buffer should return null
    const noMatch = await findDuplicateBackground(
      buf3,
      pages,
      pageBackgroundBuffers,
      pageBackgroundDataUrls,
    )
    expect(noMatch).toBeNull()
  })
})
