/**
 * BUG-01 — Regression test (#131).
 *
 * `addPage()` called with no argument (or any malformed value) used to
 * push `undefined` into the pages array, which then broke IDB persistence
 * — undefined is not JSON-serialisable — and silently wiped the whole
 * template on next reload.
 *
 * This test calls the store with a bad argument via the DEV-exposed
 * `window.__templateStore` handle and asserts the store ignores it.
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

async function onboardSolidColor(page: Page): Promise<void> {
  await page.locator('[data-testid="onboarding-solid-color"]').click()
  await page.getByRole('button', { name: /Next/i }).click()
  await page.getByRole('button', { name: /Apply/i }).click()
}

test.describe('BUG-01: addPage guard against undefined / malformed page', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    // Wait for the editor to mount.
    await expect(page.locator('[data-testid="canvas-area"], canvas').first()).toBeVisible({
      timeout: 5000,
    })
  })

  test('addPage(undefined) is ignored and the pages array stays clean', async ({ page }) => {
    const before = await page.evaluate(() => {
      type W = Window & {
        __templateStore?: { getState: () => { pages: unknown[] } }
      }
      const w = window as W
      return w.__templateStore?.getState().pages.length ?? -1
    })
    expect(before).toBeGreaterThanOrEqual(0)

    // Try every shape of bad arg the store might receive.
    await page.evaluate(() => {
      type W = Window & {
        __templateStore?: { getState: () => { addPage: (p?: unknown) => void } }
      }
      const w = window as W
      const api = w.__templateStore?.getState()
      if (!api) return
      ;(api.addPage as unknown as () => void)() // no arg
      api.addPage(null)
      api.addPage(undefined)
      api.addPage({} as Parameters<typeof api.addPage>[0]) // missing id
      api.addPage({ index: 99 } as unknown as Parameters<typeof api.addPage>[0])
    })

    const after = await page.evaluate(() => {
      type W = Window & {
        __templateStore?: { getState: () => { pages: unknown[] } }
      }
      const w = window as W
      const pages = w.__templateStore?.getState().pages ?? []
      return {
        length: pages.length,
        anyUndefined: pages.some((p) => p === undefined || p === null),
        anyMissingId: pages.some(
          (p) =>
            typeof p !== 'object' || p === null || typeof (p as { id?: unknown }).id !== 'string',
        ),
      }
    })

    expect(after.length).toBe(before)
    expect(after.anyUndefined).toBe(false)
    expect(after.anyMissingId).toBe(false)
  })
})
