import type { PageDefinition } from '@template-goblin/types'

/**
 * Result of resolving "same as previous" into a concrete snapshot.
 *
 * Either `page` is a concrete PageDefinition whose `backgroundType` is
 * `'color'` or `'image'` (never `'inherit'`), OR `page` is a neutral
 * fallback (white solid color) when no resolvable previous page exists.
 *
 * `sourceId` is the page whose background was copied, if any. The caller
 * may use it to copy the corresponding image bytes from its own map.
 */
export interface SnapshottedPage {
  page: PageDefinition
  sourceId: string | null
}

/**
 * Build the new-page definition for a "same as previous" request without
 * using `backgroundType: 'inherit'`. The returned page carries a concrete
 * `'color'` or `'image'` backgroundType cloned from the nearest
 * non-inherit previous page, so later edits or deletions of the source
 * page cannot retroactively change the snapshot.
 *
 * @param pages  the current `pages` array in index order
 * @param newId  id to assign to the new page
 * @param newIndex index to assign (typically `pages.length`)
 */
export function snapshotSameAsPrevious(
  pages: readonly PageDefinition[],
  newId: string,
  newIndex: number,
): SnapshottedPage {
  // Walk backwards to find the nearest concrete (non-inherit) previous page.
  let cursor = pages.length - 1
  let source: PageDefinition | undefined
  while (cursor >= 0) {
    const candidate = pages[cursor]
    if (candidate && candidate.backgroundType !== 'inherit') {
      source = candidate
      break
    }
    cursor -= 1
  }

  if (source && source.backgroundType === 'color') {
    return {
      page: {
        id: newId,
        index: newIndex,
        backgroundType: 'color',
        backgroundColor: source.backgroundColor ?? '#ffffff',
        backgroundFilename: null,
      },
      sourceId: source.id,
    }
  }

  if (source && source.backgroundType === 'image' && source.backgroundFilename) {
    return {
      page: {
        id: newId,
        index: newIndex,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: `backgrounds/${newId}.png`,
      },
      sourceId: source.id,
    }
  }

  // No resolvable previous page — fall back to white.
  return {
    page: {
      id: newId,
      index: newIndex,
      backgroundType: 'color',
      backgroundColor: '#ffffff',
      backgroundFilename: null,
    },
    sourceId: null,
  }
}
