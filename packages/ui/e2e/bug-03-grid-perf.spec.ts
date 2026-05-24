/**
 * BUG-03 — Regression test (#133).
 *
 * Used to build 289 individual Fabric `Line` objects for the grid on an
 * A4 page at gridSize=5. Every React state change forced a full Fabric
 * re-render that synchronously redrew all 289 lines, blocking the main
 * thread for tens of seconds.
 *
 * Fixed by collapsing the grid to a single `Rect` filled with a tiled
 * `Pattern` — one Fabric object covers the entire grid via the
 * browser's native pattern engine. This test reads
 * `window.__fabricCanvas` and asserts the grid is represented by at
 * most a handful of objects (we allow 1–3 for any future header/footer
 * grid additions), nowhere near the previous explosion.
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

test('BUG-03: grid is at most a handful of Fabric objects, not hundreds', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Wait for Fabric + the grid sync effect to flush.
  await page.waitForFunction(
    () => {
      type W = Window & {
        __fabricCanvas?: { getObjects: () => Array<{ __isGrid?: boolean }> }
      }
      const w = window as W
      const objs = w.__fabricCanvas?.getObjects() ?? []
      return objs.some((o) => o.__isGrid === true)
    },
    { timeout: 3000 },
  )

  const gridCount = await page.evaluate(() => {
    type W = Window & {
      __fabricCanvas?: { getObjects: () => Array<{ __isGrid?: boolean }> }
    }
    const w = window as W
    return (w.__fabricCanvas?.getObjects() ?? []).filter((o) => o.__isGrid === true).length
  })

  expect(gridCount).toBeGreaterThan(0)
  expect(gridCount).toBeLessThanOrEqual(3)
})
