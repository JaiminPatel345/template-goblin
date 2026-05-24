/**
 * UX-05 — Regression test (#151).
 *
 * The Lock button gave no warning before its full-screen overlay
 * appeared. The Radix tooltip now spells out exactly what Lock does
 * so the user isn't surprised by the modal-style "Template Locked"
 * overlay that follows.
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

test('UX-05: Lock button surfaces a descriptive tooltip explaining the overlay', async ({
  page,
}) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  const lock = page.locator('[data-testid="toolbar-lock"]')
  await expect(lock).toBeVisible()
  await lock.hover()
  // Radix tooltip opens after the default delay.
  await expect(page.getByText(/Lock template — disables every edit/i).first()).toBeVisible({
    timeout: 2000,
  })
})
