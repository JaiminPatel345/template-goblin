import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

/**
 * Routes that should resolve as clean deep-links on GitHub Pages.
 *
 * The site is a client-rendered SPA, but GitHub Pages serves static files —
 * a hard visit to `/docs/sdk` would 404 because no such file exists. Instead
 * of the redirect-via-404.html hack (which flashes and hurts SEO), we copy
 * the built `index.html` to `<route>/index.html` for every known route. Pages
 * then serves the app for that URL and React Router renders the right page on
 * load — clean URLs, no redirect, every route directly indexable.
 */
const ROUTES = [
  'docs',
  'docs/use-the-ui',
  'docs/sdk',
  'docs/schema',
  'docs/file-format',
  'docs/batch',
]

/** Emit a static `index.html` per known route + a 404 fallback for the rest. */
function staticRoutesPlugin(): Plugin {
  return {
    name: 'template-goblin-static-routes',
    apply: 'build',
    closeBundle() {
      const dist = resolve(__dirname, 'dist')
      const source = resolve(dist, 'index.html')
      for (const route of ROUTES) {
        const target = resolve(dist, route, 'index.html')
        mkdirSync(dirname(target), { recursive: true })
        copyFileSync(source, target)
      }
      // 404 fallback so any unforeseen deep-link still boots the SPA.
      copyFileSync(source, resolve(dist, '404.html'))
      // Disable Jekyll on Pages so files/folders are served verbatim.
      writeFileSync(resolve(dist, '.nojekyll'), '')
    },
  }
}

// `base` is injected by CI (`VITE_BASE=/template-goblin/`) so asset + route
// URLs are correct under the GitHub project-pages subpath. Local dev stays at
// `/`. React Router reads the same value via `import.meta.env.BASE_URL`.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), staticRoutesPlugin()],
  server: {
    port: 4243,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
