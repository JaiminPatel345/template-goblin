import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  // GitHub Pages base path (set via VITE_BASE env var in CI)
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 4242,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@template-goblin/types': resolve(__dirname, '../types/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    // `fake-indexeddb/auto` polyfills `indexedDB` and `IDBKeyRange` on
    // globalThis.  Required by the templateStore persist adapter (GH #11)
    // which is now backed by IndexedDB instead of localStorage.
    setupFiles: ['fake-indexeddb/auto'],
  },
})
