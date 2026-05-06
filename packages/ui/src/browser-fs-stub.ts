/**
 * fs stub for the browser bundle (#86).
 *
 * Both `fontkit` (transitive dep of PDFKit) and `pdfkit` itself import
 * named functions from `fs` at module-init time. The default
 * `vite-plugin-node-polyfills` empty mock has no named exports, so
 * Vite's pre-bundler errors out on the missing names. This module
 * provides the shape they expect — every read returns "missing", every
 * write throws — which is fine because:
 *   1. No browser code path actually calls these.
 *   2. The user supplies font + image bytes via the `LoadedTemplate`
 *      adapter, so PDFKit/fontkit never need to touch the disk.
 *
 * Aliased to `fs` and `node:fs` in `vite.config.ts`.
 */

function notSupported(): never {
  throw new Error('fs operation not supported in the browser bundle')
}

export const readFileSync = (): Buffer => {
  notSupported()
}
export const readFile = (_path: string, cb?: (err: Error | null, data?: Buffer) => void): void => {
  if (typeof cb === 'function') {
    cb(new Error('fs.readFile not supported in the browser bundle'))
    return
  }
  notSupported()
}
export const existsSync = (): boolean => false
export const statSync = (): never => notSupported()
export const writeFileSync = (): void => {
  notSupported()
}
export const mkdirSync = (): void => {
  notSupported()
}
export const promises = {
  readFile: async (): Promise<Buffer> => notSupported(),
  writeFile: async (): Promise<void> => notSupported(),
  mkdir: async (): Promise<void> => notSupported(),
}

export default {
  readFileSync,
  readFile,
  existsSync,
  statSync,
  writeFileSync,
  mkdirSync,
  promises,
}
