import { useTemplateStore } from '../../store/templateStore.js'

/**
 * TTF magic bytes we accept. 0x00010000 is TrueType, 0x74727565 is the legacy
 * "true" sfnt tag, 0x4f54544f is "OTTO" (OpenType with CFF).
 */
const TTF_MAGIC_BYTES = new Set([0x00010000, 0x74727565, 0x4f54544f])

/** Max font file size — mirrors the pre-existing FontManager limit. */
const MAX_FONT_SIZE_BYTES = 10 * 1024 * 1024

/**
 * Sanitise a filename so it is safe to stash under `fonts/<safeName>` inside
 * the `.tgbl` archive. Strips path separators, wildcards, etc.
 */
export function sanitiseFontFilename(raw: string): string {
  return raw.replace(/[/\\:*?"<>|]/g, '_').replace(/\.\./g, '_')
}

/**
 * Read a File into an ArrayBuffer. Prefers the native `file.arrayBuffer()`
 * method (spec-compliant and available in all modern browsers as well as
 * Node.js test environments). Falls back to `FileReader` for environments
 * where `arrayBuffer` is missing.
 */
function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  // `File` in the DOM and in Node's undici implementation both expose
  // `arrayBuffer()` as a Promise-returning method.
  if (
    typeof (file as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer ===
    'function'
  ) {
    return (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer()
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Result metadata for a single file in the batch. `ok: true` means the font
 * was added to the store; `ok: false` means the file was rejected (validation,
 * duplicate, or read error). Callers (e.g. FontManager) can surface a UI
 * message per rejection if desired.
 */
export interface FontUploadResult {
  filename: string
  ok: boolean
  reason?: 'extension' | 'size' | 'magic' | 'duplicate' | 'read-error'
}

/**
 * Process a batch of font files. Each file is validated independently; valid
 * files are added to the `useTemplateStore` in the order they appear.
 *
 * Contract (from bugs.md → Fonts §):
 *   - Accepts both a `File[]` array and a native `FileList`.
 *   - Skips files whose extension is not `.ttf` (case-insensitive).
 *   - Skips files larger than 10 MB.
 *   - Skips files that fail the TTF magic-bytes check.
 *   - Skips files whose sanitised name collides with an existing font's
 *     `filename` (stored as `fonts/<safeName>`).
 *   - Each accepted font gets a unique `font-<timestamp>-<random>` id so two
 *     files processed in the same millisecond still get distinct IDs.
 */
export async function processFontFiles(files: File[] | FileList): Promise<FontUploadResult[]> {
  const list: File[] = Array.isArray(files) ? files : Array.from(files)
  const results: FontUploadResult[] = []

  for (const file of list) {
    if (!file.name.toLowerCase().endsWith('.ttf')) {
      results.push({ filename: file.name, ok: false, reason: 'extension' })
      continue
    }
    if (file.size > MAX_FONT_SIZE_BYTES) {
      results.push({ filename: file.name, ok: false, reason: 'size' })
      continue
    }

    const safeName = sanitiseFontFilename(file.name)
    const targetFilename = `fonts/${safeName}`
    const existingFonts = useTemplateStore.getState().fonts
    if (existingFonts.some((f) => f.filename === targetFilename)) {
      results.push({ filename: file.name, ok: false, reason: 'duplicate' })
      continue
    }

    let buffer: ArrayBuffer
    try {
      buffer = await readAsArrayBuffer(file)
    } catch {
      results.push({ filename: file.name, ok: false, reason: 'read-error' })
      continue
    }

    if (buffer.byteLength >= 4) {
      const view = new DataView(buffer)
      const magic = view.getUint32(0)
      if (!TTF_MAGIC_BYTES.has(magic)) {
        results.push({ filename: file.name, ok: false, reason: 'magic' })
        continue
      }
    }

    const id = `font-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const name = safeName.replace(/\.ttf$/i, '')
    useTemplateStore.getState().addFont({ id, name, filename: targetFilename }, buffer)
    results.push({ filename: file.name, ok: true })
  }

  return results
}
