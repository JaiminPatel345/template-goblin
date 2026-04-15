import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
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
  },
})
