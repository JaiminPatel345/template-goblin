import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import './styles/index.css'

// React Router's basename must match Vite's `base` so links resolve under the
// GitHub project-pages subpath (`/template-goblin`). `import.meta.env.BASE_URL`
// carries the same value; strip the trailing slash (RR wants `/template-goblin`,
// not `/template-goblin/`) and fall back to `/` for local dev.
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
