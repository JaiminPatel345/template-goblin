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
import { join, extname, resolve } from 'node:path'
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

const port = parseInt(process.argv.find((a, i) => process.argv[i - 1] === '--port') || String(PORT), 10)

// Graceful shutdown
process.on('SIGINT', () => { console.log('\nShutting down...'); process.exit(0) })
process.on('SIGTERM', () => { process.exit(0) })

const server = createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0]
  let filePath = resolve(join(distDir, urlPath === '/' ? 'index.html' : urlPath))

  // Path traversal protection: ensure resolved path is within distDir
  if (!filePath.startsWith(resolve(distDir))) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  // SPA fallback
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

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${port} is already in use. Try --port <number>`)
    process.exit(1)
  }
  throw err
})

server.listen(port, () => {
  console.log(`\n  TemplateGoblin UI running at http://localhost:${port}\n`)
})
