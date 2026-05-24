/**
 * BUG-12 — Regression test (#142).
 *
 * QA reported the UNGROUPED count showed (0) right after the first
 * field was added, only catching up after a reload. The count is
 * derived directly from `fields.length` in the LeftPanel component,
 * so a Zustand subscription that re-renders on store change should
 * keep it consistent.
 *
 * This test seeds a field, then asserts the left-panel UNGROUPED row
 * shows '(1)' immediately, without a reload. If the count drifts in
 * a future regression the assertion will catch it.
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

test('BUG-12: UNGROUPED count reflects field add without reload', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Seed one field.
  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { addField: (f: unknown) => void } }
    }
    const w = window as W
    w.__templateStore?.getState().addField({
      id: 'field-bug12',
      type: 'text',
      x: 10,
      y: 10,
      width: 100,
      height: 30,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'hi' },
      style: {},
    })
  })

  // The group header reads "UNGROUPED ... (1)" once present.
  const count = page
    .locator('.tg-field-group-header', { hasText: /ungrouped/i })
    .locator('.tg-field-group-count')
  await expect(count).toHaveText('(1)')
})
