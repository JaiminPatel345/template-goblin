import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => ({
  // GitHub Pages base path (set via VITE_BASE env var in CI). In local dev the
  // editor is served under /playground/ so the marketing site's dev server
  // (port 4242) can proxy it there — one origin: / = home, /playground/* = editor.
  base: process.env.VITE_BASE || (mode === 'development' ? '/playground/' : '/'),
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
      // `Buffer: true` rewrites every module's `Buffer` reference to
      // an import from `vite-plugin-node-polyfills/shims/buffer`, which
      // Rollup can't resolve from the linked workspace package paths
      // during prod build. We assign `globalThis.Buffer` ourselves in
      // `src/main.tsx` instead — same semantic, no rewriting, build
      // and dev both work.
      globals: {
        Buffer: false,
        process: true,
        global: true,
      },
    }),
  ],
  server: {
    // Internal dev port. Users hit the unified site server on 4242, which
    // proxies /playground here. HMR connects straight back to this port.
    port: 5174,
    hmr: { clientPort: 5174 },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // PDFKit's built-in font lookup uses `__dirname` to find the bundled
  // Helvetica/Times/Courier AFM files at runtime. The browser has no
  // `__dirname`; PDFKit's standalone build inlines the data so the path
  // is unused, but the reference still has to resolve at parse time.
  // Same story for `__filename` in some transitive deps.
  define: {
    __dirname: JSON.stringify('/'),
    __filename: JSON.stringify('/index.js'),
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
      // Redirect bare `import "pdfkit"` to the standalone UMD build.
      // `pdfkit.es.js` reads its built-in AFM font files at runtime via
      // `fs.readFileSync(__dirname + '/data/...')`, which our browser fs
      // shim throws on. The standalone bundle inlines those AFM blobs
      // and bundles every transitive dep — same render output, no fs
      // reads. UMD is fine: esbuild auto-detects and Vite handles it.
      {
        find: /^pdfkit$/,
        replacement: resolve(__dirname, 'node_modules/pdfkit/js/pdfkit.standalone.js'),
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
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    setupFiles: ['src/test-setup.ts'],
    teardownTimeout: 1000,
    clearMocks: true,
    restoreMocks: true,
  },
}))
