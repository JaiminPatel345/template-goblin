import { useEffect, useState } from 'react'

export interface TocItem {
  id: string
  text: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Scroll-spy for the current doc page. Reads every `<h2>` inside `.prose`,
 * gives each a stable id, and tracks which section is currently in view so the
 * sidebar "On this page" list can follow the user's scroll. Re-scans whenever
 * `pathname` changes (i.e. on navigation to another doc page).
 */
export function useTocSpy(pathname: string): { items: TocItem[]; activeId: string } {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLHeadingElement>('.prose h2'))
    const list = headings.map((h) => {
      if (!h.id) h.id = slugify(h.textContent ?? '')
      return { id: h.id, text: h.textContent ?? '' }
    })
    setItems(list)
    setActiveId(list[0]?.id ?? '')
    if (headings.length === 0) return

    // A heading becomes "active" once it crosses into the top portion of the
    // viewport (below the sticky navbar).
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0 && visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -68% 0px', threshold: 0 },
    )
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [pathname])

  return { items, activeId }
}
