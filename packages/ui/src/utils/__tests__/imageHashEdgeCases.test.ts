import { describe, it, expect, vi } from 'vitest'
import {
  computeBufferHash,
  findDuplicateBackground,
  readFileAsDataUrlAndBuffer,
} from '../imageHash.js'
import type { PageDefinition } from '@template-goblin/types'

if (typeof globalThis.FileReader === 'undefined') {
  class MockFileReader {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | ArrayBuffer | null = null

    readAsDataURL(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = 'data:image/png;base64,' + Buffer.from(buf).toString('base64')
        if (this.onload) this.onload()
      })
    }

    readAsArrayBuffer(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf
        if (this.onload) this.onload()
      })
    }
  }
  globalThis.FileReader = MockFileReader as unknown as typeof FileReader
}

describe('imageHash — comprehensive edge cases', () => {
  it('handles empty 0-byte buffer without error', async () => {
    const emptyBuf = new Uint8Array(0).buffer
    const hash = await computeBufferHash(emptyBuf)
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('handles tiny 1-byte buffer correctly', async () => {
    const b1 = new Uint8Array([255]).buffer
    const b2 = new Uint8Array([255]).buffer
    const b3 = new Uint8Array([0]).buffer

    const h1 = await computeBufferHash(b1)
    const h2 = await computeBufferHash(b2)
    const h3 = await computeBufferHash(b3)

    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
  })

  it('uses FNV-1a fallback when crypto.subtle throws an error', async () => {
    const originalCrypto = globalThis.crypto
    // Mock crypto.subtle to throw an error
    vi.stubGlobal('crypto', {
      subtle: {
        digest: () => Promise.reject(new Error('Crypto digest failed')),
      },
    })

    const buf = new Uint8Array([1, 2, 3, 4, 5]).buffer
    const hash = await computeBufferHash(buf)

    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)

    vi.stubGlobal('crypto', originalCrypto)
  })

  it('finds match among multiple stored background buffers', async () => {
    const bufA = new Uint8Array([1, 1, 1, 1]).buffer
    const bufB = new Uint8Array([2, 2, 2, 2]).buffer
    const bufC = new Uint8Array([3, 3, 3, 3]).buffer
    const bufB_dup = new Uint8Array([2, 2, 2, 2]).buffer

    const pages: PageDefinition[] = [
      {
        id: 'p-a',
        index: 0,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/p-a.png',
        width: 595,
        height: 842,
        pageSize: 'A4',
      },
      {
        id: 'p-b',
        index: 1,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/p-b.png',
        width: 595,
        height: 842,
        pageSize: 'A4',
      },
    ]

    const pageBackgroundBuffers = new Map<string, ArrayBuffer>()
    pageBackgroundBuffers.set('p-a', bufA)
    pageBackgroundBuffers.set('p-b', bufB)

    const pageBackgroundDataUrls = new Map<string, string>()
    pageBackgroundDataUrls.set('p-a', 'data:image/png;base64,AAA')
    pageBackgroundDataUrls.set('p-b', 'data:image/png;base64,BBB')

    const matchB = await findDuplicateBackground(
      bufB_dup,
      pages,
      pageBackgroundBuffers,
      pageBackgroundDataUrls,
    )

    expect(matchB).not.toBeNull()
    expect(matchB?.filename).toBe('backgrounds/p-b.png')
    expect(matchB?.dataUrl).toBe('data:image/png;base64,BBB')

    const matchC = await findDuplicateBackground(
      bufC,
      pages,
      pageBackgroundBuffers,
      pageBackgroundDataUrls,
    )
    expect(matchC).toBeNull()
  })

  it('returns null if pageBackgroundBuffers has buffer but pageBackgroundDataUrls has no dataUrl', async () => {
    const buf = new Uint8Array([7, 7, 7, 7]).buffer
    const pages: PageDefinition[] = [
      {
        id: 'p-orphan',
        index: 0,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/p-orphan.png',
        width: 595,
        height: 842,
        pageSize: 'A4',
      },
    ]

    const pageBackgroundBuffers = new Map<string, ArrayBuffer>()
    pageBackgroundBuffers.set('p-orphan', buf)

    const pageBackgroundDataUrls = new Map<string, string>()
    // DataUrl missing for p-orphan

    const match = await findDuplicateBackground(
      buf,
      pages,
      pageBackgroundBuffers,
      pageBackgroundDataUrls,
    )
    expect(match).toBeNull()
  })

  it('readFileAsDataUrlAndBuffer reads a File into dataUrl and buffer', async () => {
    const blob = new Blob(['sample-image-content'], { type: 'image/png' })
    const file = new File([blob], 'test.png', { type: 'image/png' })

    const res = await readFileAsDataUrlAndBuffer(file)
    expect(res.dataUrl).toContain('data:image/png;base64,')
    expect(res.buffer.byteLength).toBeGreaterThan(0)
  })
})
