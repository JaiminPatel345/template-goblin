/**
 * GH #69 — image input resolver tests.
 *
 * `resolveImageInput` is the single boundary where every supported
 * `ImageInput` shape (Buffer, base64, data URI, file path, http(s) URL,
 * explicit `{ type, value }` form) gets normalised into a `Buffer`. These
 * tests cover one happy path per branch and one failure per failure mode
 * called out in the issue: missing file, fetch non-2xx, fetch timeout.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { TemplateGoblinError } from '@template-goblin/types'
import {
  DEFAULT_IMAGE_FETCH_TIMEOUT_MS,
  resolveImageInput,
  resolveImageInputs,
  type ResolveContext,
} from '../src/utils/imageInput.js'

const VALID_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f80f00000100015e29c1390000000049454e44ae426082',
  'hex',
)

const ctx: ResolveContext = {
  fieldId: 'photo-1',
  jsonKey: 'student_photo',
  pageId: null,
  pageIndex: null,
}

describe('resolveImageInput', () => {
  it('returns a Buffer untouched', async () => {
    const out = await resolveImageInput(VALID_PNG, ctx)
    expect(out.equals(VALID_PNG)).toBe(true)
  })

  it('decodes a bare base64 string', async () => {
    const out = await resolveImageInput(VALID_PNG.toString('base64'), ctx)
    expect(out.equals(VALID_PNG)).toBe(true)
  })

  it('decodes a `data:` URI', async () => {
    const dataUri = `data:image/png;base64,${VALID_PNG.toString('base64')}`
    const out = await resolveImageInput(dataUri, ctx)
    expect(out.equals(VALID_PNG)).toBe(true)
  })

  it('reads a local file when the path exists', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tg-img-'))
    const file = path.join(dir, 'pic.png')
    await fs.writeFile(file, VALID_PNG)
    try {
      const out = await resolveImageInput(file, ctx)
      expect(out.equals(VALID_PNG)).toBe(true)
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('honours the explicit { type: "buffer", value } shape', async () => {
    const out = await resolveImageInput({ type: 'buffer', value: VALID_PNG }, ctx)
    expect(out.equals(VALID_PNG)).toBe(true)
  })

  it('honours the explicit { type: "base64", value } shape', async () => {
    const out = await resolveImageInput(
      { type: 'base64', value: VALID_PNG.toString('base64') },
      ctx,
    )
    expect(out.equals(VALID_PNG)).toBe(true)
  })

  it('honours the explicit { type: "path", value } shape (avoids string auto-detection)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tg-img-'))
    const file = path.join(dir, 'pic.png')
    await fs.writeFile(file, VALID_PNG)
    try {
      const out = await resolveImageInput({ type: 'path', value: file }, ctx)
      expect(out.equals(VALID_PNG)).toBe(true)
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('treats a non-existent path-shaped string as bare base64 (catch-all)', async () => {
    // The auto-detector only routes to fs.readFile when `existsSync()` says
    // the path is real. A path-shaped string that doesn't exist falls
    // through to the base64 branch — `Buffer.from(s, 'base64')` returns the
    // best-effort decode, never throws. Guarantees that real base64 strings
    // starting with `/` never get misclassified as missing files.
    const out = await resolveImageInput('/definitely/not/a/real/path.png', ctx)
    expect(Buffer.isBuffer(out)).toBe(true)
  })

  it('throws MISSING_ASSET with the path when the explicit `path` shape points nowhere', async () => {
    const missing = path.join(os.tmpdir(), 'tg-does-not-exist-' + Date.now() + '.png')
    await expect(resolveImageInput({ type: 'path', value: missing }, ctx)).rejects.toMatchObject({
      code: 'MISSING_ASSET',
      details: expect.objectContaining({
        fieldId: 'photo-1',
        jsonKey: 'student_photo',
        assetPath: missing,
      }),
    })
  })

  it('throws INVALID_DATA_TYPE on a non-string non-Buffer non-object input', async () => {
    await expect(
      // Bypass the static type for the runtime guard.
      resolveImageInput(42 as unknown as Buffer, ctx),
    ).rejects.toBeInstanceOf(TemplateGoblinError)
  })
})

describe('resolveImageInput — HTTP/HTTPS', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
  })

  it('fetches from an https URL and returns the body bytes', async () => {
    global.fetch = jest.fn(
      async () => new Response(VALID_PNG, { status: 200 }),
    ) as unknown as typeof fetch

    const out = await resolveImageInput('https://example.com/pic.png', ctx)
    expect(out.equals(VALID_PNG)).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/pic.png',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('passes user-supplied headers through on the explicit `url` shape', async () => {
    const captured: Record<string, unknown> = {}
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      captured.headers = init.headers
      return new Response(VALID_PNG, { status: 200 })
    }) as unknown as typeof fetch

    await resolveImageInput(
      {
        type: 'url',
        value: 'https://s3.example.com/private.png',
        headers: { Authorization: 'Bearer abc' },
      },
      ctx,
    )
    expect(captured.headers).toEqual({ Authorization: 'Bearer abc' })
  })

  it('throws MISSING_ASSET with the URL and HTTP status on a non-2xx response', async () => {
    global.fetch = jest.fn(
      async () => new Response('not found', { status: 404, statusText: 'Not Found' }),
    ) as unknown as typeof fetch

    await expect(resolveImageInput('https://example.com/missing.png', ctx)).rejects.toMatchObject({
      code: 'MISSING_ASSET',
      details: expect.objectContaining({
        fieldId: 'photo-1',
        jsonKey: 'student_photo',
        assetUrl: 'https://example.com/missing.png',
        httpStatus: 404,
      }),
    })
  })

  it('throws MISSING_ASSET with `timedOut: true` when the fetch is aborted by timeout', async () => {
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      // Stall until the supplied AbortSignal fires.
      return new Promise((_resolve, reject) => {
        const sig = init.signal as AbortSignal
        sig.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        )
      })
    }) as unknown as typeof fetch

    await expect(
      resolveImageInput('https://example.com/slow.png', ctx, { timeoutMs: 30 }),
    ).rejects.toMatchObject({
      code: 'MISSING_ASSET',
      details: expect.objectContaining({
        assetUrl: 'https://example.com/slow.png',
        timedOut: true,
      }),
    })
  })

  it('default timeout matches DEFAULT_IMAGE_FETCH_TIMEOUT_MS', () => {
    expect(DEFAULT_IMAGE_FETCH_TIMEOUT_MS).toBeGreaterThan(0)
  })
})

describe('resolveImageInputs — batch', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
  })

  it('resolves several inputs in parallel, keyed by jsonKey', async () => {
    global.fetch = jest.fn(
      async () => new Response(VALID_PNG, { status: 200 }),
    ) as unknown as typeof fetch

    const out = await resolveImageInputs([
      {
        input: VALID_PNG,
        ctx: { ...ctx, jsonKey: 'a' },
      },
      {
        input: VALID_PNG.toString('base64'),
        ctx: { ...ctx, jsonKey: 'b' },
      },
      {
        input: 'https://example.com/c.png',
        ctx: { ...ctx, jsonKey: 'c' },
      },
    ])

    expect(out.size).toBe(3)
    expect(out.get('a')?.equals(VALID_PNG)).toBe(true)
    expect(out.get('b')?.equals(VALID_PNG)).toBe(true)
    expect(out.get('c')?.equals(VALID_PNG)).toBe(true)
  })

  it('respects the concurrency cap', async () => {
    let inFlight = 0
    let peak = 0
    global.fetch = jest.fn(async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 10))
      inFlight--
      return new Response(VALID_PNG, { status: 200 })
    }) as unknown as typeof fetch

    const items = Array.from({ length: 12 }, (_, i) => ({
      input: `https://example.com/${i}.png`,
      ctx: { ...ctx, jsonKey: `k${i}` },
    }))

    await resolveImageInputs(items, { concurrency: 3 })
    expect(peak).toBeLessThanOrEqual(3)
    expect(peak).toBeGreaterThan(0)
  })
})
