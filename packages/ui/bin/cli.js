#!/usr/bin/env node

/**
 * template-goblin-ui CLI
 *
 * Serves the pre-built UI as a static site.
 * Usage: npx template-goblin-ui
 * Opens at http://localhost:4242
 */

import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, '..', 'dist')
const PORT = process.env.PORT || 4242

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

if (!existsSync(distDir)) {
  console.error('Error: dist/ not found. Run `pnpm build` in packages/ui first.')
  process.exit(1)
}

const server = createServer((req, res) => {
  let filePath = join(distDir, req.url === '/' ? 'index.html' : req.url)

  if (!existsSync(filePath)) {
    filePath = join(distDir, 'index.html')
  }

  const ext = extname(filePath)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  try {
    const content = readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, () => {
  console.log(`\n  TemplateGoblin UI running at http://localhost:${PORT}\n`)
})
