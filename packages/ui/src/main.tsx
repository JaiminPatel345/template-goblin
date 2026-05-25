import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.js'
import { DialogProvider } from './components/Dialogs/index.js'

// GH #86 — `template-goblin/browser` and PDFKit's standalone build reach
// for `globalThis.Buffer` at module-init. `vite-plugin-node-polyfills`
// can rewrite per-module Buffer references, but its auto-injected
// imports break Rollup's prod build under pnpm's symlinked layout
// (the shim resolves to `vite-plugin-node-polyfills/shims/buffer`,
// which only sits in the UI's nested `node_modules`). Setting the
// global manually here gives us the same semantic without the rewrite.
const globalScope = globalThis as unknown as { Buffer?: typeof Buffer }
if (!globalScope.Buffer) globalScope.Buffer = Buffer

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </React.StrictMode>,
)
