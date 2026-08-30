import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import { SiteLayout } from './components/SiteLayout'
import { DocsLayout } from './components/DocsLayout'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { DocsHome } from './pages/docs/DocsHome'
import { UseTheUi } from './pages/docs/UseTheUi'
import { Sdk } from './pages/docs/Sdk'
import { Schema } from './pages/docs/Schema'
import { FileFormat } from './pages/docs/FileFormat'
import { Batch } from './pages/docs/Batch'

/** Reset scroll to the top on every navigation (SPA default keeps it). */
function ScrollToTop(): null {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Route table for the marketing site + documentation. */
export function App(): React.JSX.Element {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="docs" element={<DocsLayout />}>
            <Route index element={<DocsHome />} />
            <Route path="use-the-ui" element={<UseTheUi />} />
            <Route path="sdk" element={<Sdk />} />
            <Route path="schema" element={<Schema />} />
            <Route path="file-format" element={<FileFormat />} />
            <Route path="batch" element={<Batch />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
