import { Outlet } from 'react-router'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

/** Shell shared by every page: sticky navbar, routed content, footer. */
export function SiteLayout() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
