/**
 * UX-06 — Regression test (#152).
 *
 * Field-type badges in the left panel were inconsistent: TEXT had a
 * blue badge, IMAGE had a green badge, but TABLE had no styling
 * (CSS class was `--loop`, the field.type is `'table'`). Now both
 * `--loop` and `--table` map to the orange badge.
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

test('UX-06: table field renders a visible type badge', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { addField: (f: unknown) => void } }
    }
    const w = window as W
    w.__templateStore?.getState().addField({
      id: 'field-ux06-table',
      type: 'table',
      x: 10,
      y: 10,
      width: 200,
      height: 100,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'dynamic', jsonKey: 'rows', required: false, placeholder: [] },
      style: { columns: [{ key: 'a', label: 'A', width: 100, align: 'left' }] },
    })
  })

  const badge = page.locator('.tg-field-type-badge--table').first()
  await expect(badge).toBeVisible()
  await expect(badge).toHaveText(/Table/i)

  const colour = await badge.evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor
  })
  // The CSS sets rgba(217,119,6,0.15) — any non-empty/non-transparent
  // background means the rule is applying.
  expect(colour).not.toBe('rgba(0, 0, 0, 0)')
  expect(colour).not.toBe('')
})
