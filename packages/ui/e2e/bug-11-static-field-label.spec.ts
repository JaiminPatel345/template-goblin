/**
 * BUG-11 — Regression test (#141).
 *
 * The right-panel field list rendered '<static text>' for every static
 * text field, regardless of its actual content. Now the list shows the
 * truncated value, the filename for static images, and a row-count for
 * static tables.
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

test('BUG-11: static text field shows its content in the list, not <static text>', async ({
  page,
}) => {
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
      id: 'field-bug11',
      type: 'text',
      x: 10,
      y: 10,
      width: 200,
      height: 30,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'Certificate of Excellence' },
      style: {},
    })
  })

  // Label visible in the left-panel field list.
  const labelText = page.locator('.tg-field-item-key', { hasText: 'Certificate of Excellence' })
  await expect(labelText).toBeVisible()

  // Nowhere on the page should the literal "<static text>" appear for this field.
  await expect(page.locator('.tg-field-item-key', { hasText: '<static text>' })).toHaveCount(0)
})
