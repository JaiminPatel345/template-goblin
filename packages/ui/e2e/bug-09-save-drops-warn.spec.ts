/**
 * BUG-09 — Regression test (#137), updated for #158.
 *
 * Saving with a no-source field surfaces a user-visible dialog
 * listing the dropped ids. Previously the test stubbed
 * window.alert; now the same surface is rendered through the
 * custom AlertDialog primitive, so we drive it by its testid.
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

test('BUG-09: saving with a no-source field opens a custom Alert listing the dropped ids', async ({
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
      id: 'field-bug09-legacy',
      type: 'text',
      x: 10,
      y: 10,
      width: 100,
      height: 30,
      zIndex: 0,
      pageId: null,
      groupId: null,
      style: {},
    })
  })

  await page.locator('[data-testid="toolbar-save"]').click()

  const dialog = page.locator('[data-testid="dialog-alert"]')
  await expect(dialog).toBeVisible({ timeout: 5000 })
  await expect(dialog).toContainText(/could not be written|outdated format/i)
  await expect(dialog).toContainText('field-bug09-legacy')

  await page.locator('[data-testid="dialog-alert-ok"]').click()
  await expect(dialog).toHaveCount(0)
})
