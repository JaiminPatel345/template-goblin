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
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.name = 'description'
      document.head.appendChild(tag)
    }
    tag.content = description
  }, [title, description])
}
