/**
 * useCurrentBackground — resolves the active page's background image data
 * URL and/or fill colour from the template store. Splits into:
 *  - Multi-page templates: read the current page's `backgroundType` and
 *    follow `'inherit'` upward until we hit a concrete `image` or `color`
 *    page; the legacy top-level `backgroundDataUrl` is the final fallback.
 *  - Single-page legacy templates: just the legacy `backgroundDataUrl`.
 *
 * Extracted from `CanvasArea.tsx` so that file stays under the 300 LOC cap
 * (Hard Rule #11). Pure read of two stores — no side effects.
 */
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'

export interface CurrentBackground {
  /** Resolved data URL for the current page's background image, or null. */
  currentBgDataUrl: string | null
  /** Resolved fill colour for the current page, or null when not a colour page. */
  currentBgColor: string | null
}

/** Resolve the current page's background (image + colour) from the store. */
export function useCurrentBackground(): CurrentBackground {
  const pages = useTemplateStore((s) => s.pages)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)
  const pageBackgroundDataUrls = useTemplateStore((s) => s.pageBackgroundDataUrls)
  const currentPageId = useUiStore((s) => s.currentPageId)

  // Guard: if the persisted currentPageId no longer exists in the current
  // template (e.g. stale localStorage from a previous session), treat it as
  // null so that page-0 / backgroundDataUrl fallbacks apply correctly.
  const effectivePageId =
    currentPageId !== null && pages.some((p) => p.id === currentPageId) ? currentPageId : null

  const currentBgDataUrl = ((): string | null => {
    if (pages.length === 0) return backgroundDataUrl
    if (effectivePageId === null) {
      // No explicit page is "current". Prefer an explicit `pages[0]` image
      // if one exists (this happens after removing a color page while an
      // image page remains — GH #23). Otherwise fall back to the legacy
      // `backgroundDataUrl`.
      const page0 = pages.find((p) => p.index === 0)
      if (page0 && page0.backgroundType === 'image') {
        return pageBackgroundDataUrls.get(page0.id) ?? backgroundDataUrl
      }
      return backgroundDataUrl
    }

    const page = pages.find((p) => p.id === effectivePageId)
    if (!page) return backgroundDataUrl

    if (page.backgroundType === 'image') {
      return pageBackgroundDataUrls.get(page.id) ?? null
    }
    if (page.backgroundType === 'inherit') {
      for (let i = page.index - 1; i >= 0; i--) {
        const prev = pages.find((p) => p.index === i)
        if (!prev) continue
        if (prev.backgroundType === 'image') {
          return pageBackgroundDataUrls.get(prev.id) ?? null
        }
        if (prev.backgroundType === 'color') return null
      }
      return backgroundDataUrl
    }
    return null
  })()

  const currentBgColor = ((): string | null => {
    if (pages.length === 0) return null
    if (effectivePageId === null) {
      const page0 = pages.find((p) => p.index === 0)
      if (page0 && page0.backgroundType === 'color') return page0.backgroundColor
      return null
    }
    const page = pages.find((p) => p.id === effectivePageId)
    if (!page) return null
    if (page.backgroundType === 'color') return page.backgroundColor
    return null
  })()

  return { currentBgDataUrl, currentBgColor }
}
