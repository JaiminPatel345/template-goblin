/**
 * BUG-04 — Regression test (#138).
 *
 * Setting showGrid=false used to leave Fabric grid objects on the
 * canvas (per QA report). With BUG-03's fix the grid is now a single
 * patterned Rect, and the existing reconciliation effect in
 * useFabricSync already removes anything tagged `__isGrid` when the
 * effect re-runs with `showGrid=false`. This test pins that the toggle
 * leaves zero grid objects behind, in either direction.
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

async function gridCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    type W = Window & {
      __fabricCanvas?: { getObjects: () => Array<{ __isGrid?: boolean }> }
    }
    const w = window as W
    return (w.__fabricCanvas?.getObjects() ?? []).filter((o) => o.__isGrid === true).length
  })
}

async function setShowGrid(page: Page, value: boolean): Promise<void> {
  await page.evaluate((v) => {
    type W = Window & {
      __uiStore?: { getState: () => { setShowGrid: (b: boolean) => void } }
    }
    const w = window as W
    w.__uiStore?.getState().setShowGrid(v)
  }, value)
}

test('BUG-04: toggling showGrid off removes all grid Fabric objects', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  await page.waitForFunction(
    () => {
      type W = Window & {
        __fabricCanvas?: { getObjects: () => Array<{ __isGrid?: boolean }> }
      }
      const w = window as W
      return (w.__fabricCanvas?.getObjects() ?? []).some((o) => o.__isGrid === true)
    },
    { timeout: 3000 },
  )

  expect(await gridCount(page)).toBeGreaterThan(0)

  await setShowGrid(page, false)
  await page.waitForTimeout(200) // let the effect flush
  expect(await gridCount(page)).toBe(0)

  await setShowGrid(page, true)
  await page.waitForTimeout(200)
  expect(await gridCount(page)).toBeGreaterThan(0)
})
