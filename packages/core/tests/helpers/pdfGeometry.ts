/**
 * pdfGeometry — parse a generated PDF (the real PDFKit output) with PDF.js
 * and expose each text run's position, so tests can assert that the PDF
 * layout matches the template / canvas (e.g. the spacing between two fields,
 * or that a vertically-centred field isn't rendered at the top).
 *
 * Coordinate model: PDF user space has its origin at the BOTTOM-LEFT (y up);
 * the template + editor canvas use a TOP-LEFT origin (y down). We convert the
 * text baseline to top-left coordinates (`baselineY = pageHeight - f`) so the
 * numbers line up with `field.y`. Distances between two runs are origin- and
 * ascent-independent (the offset cancels in the difference), so they are the
 * most robust thing to assert.
 *
 * Test-only helper — PDF.js (`pdfjs-dist`) is a devDependency used solely to
 * read back generated PDFs in tests; it is never imported by `src/`.
 */
// PDF.js's `legacy/build/pdf.js` is the CommonJS build — required because the
// core Jest runtime evaluates node_modules as CJS (the ESM `.mjs` build uses
// `import.meta` and can't be loaded here). We only parse (getTextContent /
// getViewport), never render to a canvas, so no `canvas` package or real
// worker thread is needed; PDF.js uses its in-process fallback worker.
//
// Minimal local typing for the slice of the API we use (the CJS subpath has
// no bundled declarations), so we stay `any`-free per Hard Rule #4.
interface PdfTextContentItem {
  str?: string
  transform?: number[]
  width?: number
  height?: number
}
interface PdfPage {
  getViewport(opts: { scale: number }): { width: number; height: number }
  getTextContent(): Promise<{ items: PdfTextContentItem[] }>
}
interface PdfDocument {
  numPages: number
  getPage(n: number): Promise<PdfPage>
  cleanup(): Promise<void>
  destroy(): Promise<void>
}
declare module 'pdfjs-dist/legacy/build/pdf.js' {
  export function getDocument(src: {
    data: Uint8Array
    isEvalSupported?: boolean
    useSystemFonts?: boolean
    /** 0 = errors only — silences the standard-font fetch warnings in Node. */
    verbosity?: number
  }): { promise: Promise<PdfDocument> }
}
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js'

export interface PdfTextRun {
  /** The text string of this run. */
  str: string
  /** Left edge (x) in PDF points, top-left origin (same axis as `field.x`). */
  x: number
  /** Text baseline (y) in points, converted to top-left origin (y down). */
  baselineY: number
  /** Run width in points. */
  width: number
  /** Glyph box height in points (≈ font size). */
  fontHeight: number
}

export interface PdfPageGeometry {
  width: number
  height: number
  texts: PdfTextRun[]
}

/** Parse every page of a generated PDF into positioned text runs. */
export async function parsePdfGeometry(bytes: Buffer | Uint8Array): Promise<PdfPageGeometry[]> {
  // PDF.js rejects a Node `Buffer` (a Uint8Array subclass) — copy into a
  // plain Uint8Array.
  const data = new Uint8Array(bytes)
  const doc = await getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  }).promise
  try {
    const pages: PdfPageGeometry[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const viewport = page.getViewport({ scale: 1 })
      const content = await page.getTextContent()
      const texts: PdfTextRun[] = []
      for (const item of content.items) {
        // Image / marked-content items have no `str`; skip them.
        if (!('str' in item) || typeof item.str !== 'string' || item.str.trim() === '') continue
        const transform = item.transform as number[]
        texts.push({
          str: item.str,
          x: transform[4] ?? 0,
          baselineY: viewport.height - (transform[5] ?? 0),
          width: item.width ?? 0,
          fontHeight: item.height ?? 0,
        })
      }
      pages.push({ width: viewport.width, height: viewport.height, texts })
    }
    return pages
  } finally {
    await doc.cleanup()
    await doc.destroy()
  }
}

/** Concatenated text of a page, handy for presence assertions. */
export function pageText(page: PdfPageGeometry): string {
  return page.texts.map((t) => t.str).join('')
}

/** Find the first run whose text contains `needle`. */
export function findRun(page: PdfPageGeometry, needle: string): PdfTextRun | undefined {
  return page.texts.find((t) => t.str.includes(needle))
}
