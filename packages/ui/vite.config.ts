import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'node:path'

export default defineConfig({
  // GitHub Pages base path (set via VITE_BASE env var in CI)
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    // GH #86 — the in-browser PDF preview now calls core's `generatePDF`,
    // which runs PDFKit. PDFKit and `template-goblin/core` reach for
    // `Buffer`, `node:fs`, `stream`, `events`, `util`, `zlib` at module
    // scope. The polyfill plugin satisfies these in the browser bundle so
    // the same code paths produce byte-identical PDFs as the Node SDK.
    // `protocolImports: true` covers the `node:fs` style imports used
    // in `packages/core/src/utils/imageInput.ts`.
    nodePolyfills({
      protocolImports: true,
      // Skip the built-in `fs` polyfill — its empty mock has no named
      // exports, which breaks `fontkit` (and `pdfkit`'s `file/read.js`
      // path) at pre-bundle time. We supply a custom `fs` shim via a
      // resolve.alias below that exposes the right named-export shape
      // and throws on actual reads/writes (browser code paths never
      // hit fs because we feed PDFKit pre-loaded Buffers).
      exclude: ['fs'],
      globals: {
        Buffer: true,
        process: true,
        global: true,
      },
    }),
  ],
  server: {
    port: 4242,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    // Array form lets us use a regex `find` so the `pdfkit` alias matches
    // only the exact bare specifier — string-form aliases match by prefix
    // and would rewrite `pdfkit/js/pdfkit.es.js` into a doubled path
    // when Vite re-resolves subpath imports.
    alias: [
      {
        find: '@template-goblin/types',
        replacement: resolve(__dirname, '../types/src/index.ts'),
      },
      // Redirect bare `import "pdfkit"` (in the core package) to the ESM
      // browser build. PDFKit's published `main` is a Node CJS bundle that
      // Vite's pre-bundler can't ingest.
      {
        find: /^pdfkit$/,
        replacement: resolve(__dirname, 'node_modules/pdfkit/js/pdfkit.es.js'),
      },
      // Custom fs shim — see the `nodePolyfills` block above. fontkit /
      // pdfkit / core/file/* import named functions from `fs`; the empty
      // polyfill has none. The shim exports the right names and throws
      // on use, which is fine because the browser path never calls them.
      {
        find: /^(node:)?fs$/,
        replacement: resolve(__dirname, 'src/browser-fs-stub.ts'),
      },
    ],
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    // `fake-indexeddb/auto` polyfills `indexedDB` and `IDBKeyRange` on
    // globalThis.  Required by the templateStore persist adapter (GH #11)
    // which is now backed by IndexedDB instead of localStorage.
    setupFiles: ['fake-indexeddb/auto'],
  },
})
