/**
 * BUG-02 — Regression test (#132).
 *
 * On fresh editor mount after onboarding, `currentPageId` used to stay
 * `null` even though `pages[0]` was already explicit. Most stamping
 * code paths fell back to the implicit page-0 id, but the UI state
 * being null was a confusing footgun that the QA tester surfaced.
 *
 * CanvasArea now auto-snaps `currentPageId` to `pages[0].id` whenever
 * pages exist and the current id is null. This test drives the
 * onboarding flow and asserts the UI store has a real page id by the
 * time the editor is rendered.
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

test.describe('BUG-02: currentPageId initialised on editor mount', () => {
  test('after onboarding, ui store currentPageId matches pages[0].id', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

    // Wait for the auto-snap effect to flush.
    await page.waitForFunction(
      () => {
        type W = Window & {
          __uiStore?: { getState: () => { currentPageId: string | null } }
          __templateStore?: { getState: () => { pages: Array<{ id: string }> } }
        }
        const w = window as W
        const ui = w.__uiStore?.getState()
        const tpl = w.__templateStore?.getState()
        return !!ui && !!tpl && ui.currentPageId !== null && tpl.pages.length > 0
      },
      { timeout: 3000 },
    )

    const state = await page.evaluate(() => {
      type W = Window & {
        __uiStore?: { getState: () => { currentPageId: string | null } }
        __templateStore?: { getState: () => { pages: Array<{ id: string }> } }
      }
      const w = window as W
      return {
        currentPageId: w.__uiStore?.getState().currentPageId ?? null,
        firstPageId: w.__templateStore?.getState().pages[0]?.id ?? null,
      }
    })

    expect(state.currentPageId).not.toBeNull()
    expect(state.currentPageId).toBe(state.firstPageId)
  })
})
