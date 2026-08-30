import { Outlet } from 'react-router'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

/** Shell shared by every page: sticky navbar, routed content, footer. */
export function SiteLayout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
