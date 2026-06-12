import { useEffect } from 'react'

/**
 * Set the document `<title>` and meta description for the current route.
 *
 * React Router's declarative mode has no built-in head management, but search
 * engines and Lighthouse's SEO audit still expect a per-page title +
 * description. This tiny hook writes them on mount/update — enough for a
 * client-rendered marketing site whose routes are also prerendered to static
 * `index.html` copies at build time.
 */
export function useDocumentMeta(title: string, description: string): void {
  useEffect(() => {
    document.title = title

    let desc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!desc) {
      desc = document.createElement('meta')
      desc.name = 'description'
      document.head.appendChild(desc)
    }
    desc.content = description

    // Point the canonical at the current route so deep-linked pages don't all
    // report the home URL (every prerendered route ships the same index.html).
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = window.location.origin + window.location.pathname
  }, [title, description])
}
