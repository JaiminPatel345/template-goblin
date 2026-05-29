/**
 * #163 — Regression test for the image-upload onboarding path.
 *
 * Investigation found that the image-upload onboarding flow uses the
 * LEGACY single-page background model: `setBackground(dataUrl, buf)`
 * writes only `state.backgroundDataUrl` + `state.backgroundBuffer`
 * and leaves `state.pages` empty. As a result `currentPageId` stays
 * null, and the auto-init effect from #132 (which requires
 * `pages.length > 0`) does NOT fire — by design.
 *
 * The path the QA report worried about (BUG-01-style state where the
 * editor mounts with no usable page id) is in fact safe here: the
 * wireMouseEvents code path stamps new fields with `pageId: null`
 * and CanvasArea's `isOnPage1` filter (`currentPageId === null`
 * branch) renders them correctly on the implicit page 0.
 *
 * This test pins the END-USER behaviour rather than the specific
 * store value: after image-upload onboarding, adding a field via the
 * store path puts a renderable group on the Fabric canvas. If a
 * future refactor breaks the implicit-page fallback, this test
 * surfaces the regression.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

async function clearStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('template-goblin-template')
    localStorage.removeItem('template-goblin-ui')
    try {
      indexedDB.deleteDatabase('template-goblin')
    } catch {
      /* ignore */
    }
  })
}

// 4×4 red PNG — small valid bitmap PDFKit accepts.
const TINY_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4XmP8z8AARBgAcwBQEgEDA' +
    'XAGRgwAAAAASUVORK5CYII=',
  'base64',
)

test('#163: image-upload onboarding mounts a functional editor (legacy implicit-page-0 path)', async ({
  page,
}) => {
  await clearStorage(page)
  await page.goto('/')
  await expect(page.locator('[data-testid="onboarding-upload-image"]')).toBeVisible({
    timeout: 5000,
  })

  await page
    .locator('input[type="file"][accept="image/*"]')
    .first()
    .setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: TINY_PNG_BYTES })

  await expect(page.getByRole('heading', { name: /Select Page Size/i })).toBeVisible({
    timeout: 3000,
  })
  await page.locator('[data-testid="toolbar-page-size-apply"]').click()
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Sanity: the store is in the legacy single-page background shape —
  // backgroundDataUrl set, pages array empty, currentPageId null (the
  // path the QA report was nervous about).
  const initial = await page.evaluate(() => {
    type W = Window & {
      __uiStore?: { getState: () => { currentPageId: string | null } }
      __templateStore?: {
        getState: () => { pages: unknown[]; backgroundDataUrl: string | null }
      }
    }
    const w = window as W
    return {
      currentPageId: w.__uiStore?.getState().currentPageId ?? null,
      pagesLen: w.__templateStore?.getState().pages.length ?? -1,
      hasBg: !!w.__templateStore?.getState().backgroundDataUrl,
    }
  })
  expect(initial.hasBg).toBe(true)
  expect(initial.pagesLen).toBe(0)
  // currentPageId may be null — that's the implicit-page-0 path.

  // Drop a field via the store path — the user's drag-to-create
  // ends up here too via wireMouseEvents → handlePopupConfirm.
  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { addField: (f: unknown) => void } }
    }
    const w = window as W
    w.__templateStore!.getState().addField({
      id: 'field-163-text',
      type: 'text',
      x: 40,
      y: 40,
      width: 200,
      height: 24,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'image-onboarding works' },
      style: {},
    })
  })

  // Wait for Fabric reconciliation, then assert the field rendered on
  // the canvas — proves the implicit-page-0 path resolves a body
  // field with pageId=null + currentPageId=null correctly.
  await page.waitForFunction(
    () => {
      type W = Window & {
        __fabricCanvas?: { getObjects: () => Array<{ __fieldId?: string }> }
      }
      const w = window as W
      return (w.__fabricCanvas?.getObjects() ?? []).some((o) => o.__fieldId === 'field-163-text')
    },
    { timeout: 3000 },
  )

  const count = await page.evaluate(() => {
    type W = Window & {
      __fabricCanvas?: { getObjects: () => Array<{ __fieldId?: string }> }
    }
    const w = window as W
    return (w.__fabricCanvas?.getObjects() ?? []).filter((o) => o.__fieldId === 'field-163-text')
      .length
  })
  expect(count).toBeGreaterThan(0)
})
