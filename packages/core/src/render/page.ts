import type PDFDocument from 'pdfkit'
import type { PageDefinition, TemplateMeta } from '@template-goblin/types'
import { TemplateGoblinError, getPageSize } from '@template-goblin/types'
import { renderBackground, renderColorBackground } from './background.js'
import { pageLabel, type PageContext } from '../utils/errorContext.js'

/**
 * Render the background for a single page based on its backgroundType.
 *
 * @returns The resolved background image Buffer for this page (for inherit chain)
 */
export function renderPageBackground(
  doc: InstanceType<typeof PDFDocument>,
  page: PageDefinition,
  meta: TemplateMeta,
  pageBackgrounds: Map<string, Buffer>,
  backgroundImage: Buffer | null,
  previousBackground: Buffer | null,
): Buffer | null {
  const pageSize = getPageSize(page, meta)

  switch (page.backgroundType) {
    case 'image': {
      const bgBuffer = pageBackgrounds.get(page.id) ?? (page.index === 0 ? backgroundImage : null)
      renderBackground(doc, bgBuffer, meta, pageSize)
      return bgBuffer
    }
    case 'color': {
      if (page.backgroundColor) {
        renderColorBackground(doc, page.backgroundColor, meta, pageSize)
      }
      return null
    }
    case 'inherit': {
      renderBackground(doc, previousBackground, meta, pageSize)
      return previousBackground
    }
    default:
      return null
  }
}

/**
 * Run a background-rendering closure and rewrap any non-`TemplateGoblinError`
 * with page context so callers see which page failed.
 */
export function renderPageBackgroundSafely(
  _doc: InstanceType<typeof PDFDocument>,
  fn: () => void,
  pageCtx: PageContext,
): void {
  try {
    fn()
  } catch (error) {
    if (error instanceof TemplateGoblinError) throw error
    throw new TemplateGoblinError(
      'PDF_GENERATION_FAILED',
      `PDF generation failed rendering background${pageLabel(pageCtx)}: ${error instanceof Error ? error.message : 'unknown error'}`,
      { pageId: pageCtx.pageId, pageIndex: pageCtx.pageIndex },
    )
  }
}
