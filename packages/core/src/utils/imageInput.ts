import { promises as fs } from 'node:fs'
import { existsSync } from 'node:fs'
import type { ImageInput } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'

/**
 * Default HTTP fetch timeout for `url`-shaped image inputs (10s). Override
 * per `generatePDF` call via `imageFetchTimeoutMs`.
 */
export const DEFAULT_IMAGE_FETCH_TIMEOUT_MS = 10_000

/**
 * Default concurrency cap for resolving a batch of image inputs in parallel.
 * Bounded so a template with 100 URL fields doesn't open 100 sockets at once.
 */
export const DEFAULT_IMAGE_RESOLVE_CONCURRENCY = 6

/**
 * Field/page context attached to any error raised while resolving one input,
 * so callers see "field X on page 2" not just "fetch failed".
 */
export interface ResolveContext {
  fieldId: string
  jsonKey: string
  pageId: string | null
  pageIndex: number | null
}

/** Per-call options for {@link resolveImageInput}. */
export interface ResolveOptions {
  /** Abort the HTTP fetch after this many ms. Default 10 000. */
  timeoutMs?: number
}

/**
 * Resolve a single {@link ImageInput} (any of the supported shapes) into a
 * `Buffer` of the underlying image bytes. Throws `TemplateGoblinError` with
 * code `MISSING_ASSET` when a path doesn't exist or an HTTP fetch fails. The
 * thrown error always carries the `fieldId`, `jsonKey`, and the resolved
 * path/URL in `details` so callers can route the failure precisely.
 *
 * Detection order (mirrors {@link ImageInput} JSDoc):
 *   1. Object form `{ type, value }` → forced shape, no detection.
 *   2. `Buffer` → use directly.
 *   3. `string` starts with `data:` → strip prefix, decode base64.
 *   4. `string` starts with `http://` / `https://` → fetch.
 *   5. `string` looks like a filesystem path AND `fs.existsSync()` → read.
 *   6. Otherwise → treat as bare base64 (catch-all).
 */
export async function resolveImageInput(
  input: ImageInput,
  ctx: ResolveContext,
  opts: ResolveOptions = {},
): Promise<Buffer> {
  const timeout = opts.timeoutMs ?? DEFAULT_IMAGE_FETCH_TIMEOUT_MS

  if (Buffer.isBuffer(input)) return input

  if (typeof input === 'object' && input !== null && 'type' in input) {
    switch (input.type) {
      case 'buffer':
        return input.value
      case 'base64':
        return decodeBase64(input.value)
      case 'path':
        return readFromPath(input.value, ctx)
      case 'url':
        return fetchFromUrl(input.value, ctx, timeout, input.headers)
    }
  }

  if (typeof input !== 'string') {
    // ImageInput's static type forbids this branch; runtime guard for callers
    // that bypass the type system (raw JSON parsing, etc.).
    throw new TemplateGoblinError(
      'INVALID_DATA_TYPE',
      `Image input for 'images.${ctx.jsonKey}' (field '${ctx.fieldId}') must be Buffer, string, or { type, value } — got ${typeof input}.`,
      {
        fieldId: ctx.fieldId,
        fieldType: 'image',
        jsonKey: ctx.jsonKey,
        pageId: ctx.pageId,
        pageIndex: ctx.pageIndex,
      },
    )
  }

  if (input.startsWith('data:')) return decodeBase64(input)
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return fetchFromUrl(input, ctx, timeout)
  }
  if (looksLikePath(input) && existsSync(input)) {
    return readFromPath(input, ctx)
  }
  return decodeBase64(input)
}

/** Resolve a batch of inputs in parallel with a concurrency cap. */
export async function resolveImageInputs(
  inputs: Array<{ input: ImageInput; ctx: ResolveContext }>,
  opts: ResolveOptions & { concurrency?: number } = {},
): Promise<Map<string, Buffer>> {
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_IMAGE_RESOLVE_CONCURRENCY)
  const out = new Map<string, Buffer>()
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < inputs.length) {
      const i = cursor++
      const item = inputs[i]
      if (!item) return
      const bytes = await resolveImageInput(item.input, item.ctx, opts)
      out.set(item.ctx.jsonKey, bytes)
    }
  }

  const workerCount = Math.min(concurrency, inputs.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Heuristic for "this string is a filesystem path, not bare base64". We only
 * accept obviously path-shaped prefixes — bare relative names like `image.png`
 * stay in the base64 catch-all so a real base64 string with no other markers
 * isn't misclassified. The actual `existsSync()` check is the safety net.
 */
function looksLikePath(s: string): boolean {
  if (s.length === 0) return false
  if (s.startsWith('/') || s.startsWith('./') || s.startsWith('../') || s.startsWith('~/')) {
    return true
  }
  // Windows drive letter (`C:\` or `C:/`).
  return /^[A-Za-z]:[\\/]/.test(s)
}

function decodeBase64(value: string): Buffer {
  let str = value
  if (str.startsWith('data:')) {
    const comma = str.indexOf(',')
    if (comma !== -1) str = str.slice(comma + 1)
  }
  return Buffer.from(str, 'base64')
}

async function readFromPath(path: string, ctx: ResolveContext): Promise<Buffer> {
  try {
    return await fs.readFile(path)
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err)
    throw new TemplateGoblinError(
      'MISSING_ASSET',
      `Image file not found for 'images.${ctx.jsonKey}' (field '${ctx.fieldId}'): could not read '${path}' (${cause}).`,
      {
        fieldId: ctx.fieldId,
        fieldType: 'image',
        jsonKey: ctx.jsonKey,
        assetPath: path,
        pageId: ctx.pageId,
        pageIndex: ctx.pageIndex,
      },
    )
  }
}

async function fetchFromUrl(
  url: string,
  ctx: ResolveContext,
  timeoutMs: number,
  headers?: Record<string, string>,
): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, headers })
    if (!res.ok) {
      throw new TemplateGoblinError(
        'MISSING_ASSET',
        `Image fetch failed for 'images.${ctx.jsonKey}' (field '${ctx.fieldId}'): ${res.status} ${res.statusText} from ${url}.`,
        {
          fieldId: ctx.fieldId,
          fieldType: 'image',
          jsonKey: ctx.jsonKey,
          assetUrl: url,
          httpStatus: res.status,
          pageId: ctx.pageId,
          pageIndex: ctx.pageIndex,
        },
      )
    }
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
  } catch (err) {
    if (err instanceof TemplateGoblinError) throw err
    const aborted = err instanceof Error && err.name === 'AbortError'
    const cause = err instanceof Error ? err.message : String(err)
    throw new TemplateGoblinError(
      'MISSING_ASSET',
      aborted
        ? `Image fetch timed out after ${timeoutMs}ms for 'images.${ctx.jsonKey}' (field '${ctx.fieldId}'): ${url}.`
        : `Image fetch failed for 'images.${ctx.jsonKey}' (field '${ctx.fieldId}'): ${cause} (url: ${url}).`,
      {
        fieldId: ctx.fieldId,
        fieldType: 'image',
        jsonKey: ctx.jsonKey,
        assetUrl: url,
        timedOut: aborted,
        pageId: ctx.pageId,
        pageIndex: ctx.pageIndex,
      },
    )
  } finally {
    clearTimeout(timer)
  }
}
