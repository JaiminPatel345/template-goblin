/**
 * UX-07 — Regression test (#153).
 *
 * The JSON Preview panel rendered the user's typed placeholder
 * values as if they were sample data, misleading developers
 * inspecting the panel to understand the expected JSON schema.
 * A small '(sample / placeholder values)' note now sits next to
 * the panel title so the distinction is clear.
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

test('UX-07: JSON Preview title carries a placeholder/sample note', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  const note = page.locator('[data-testid="json-preview-placeholder-note"]')
  await expect(note).toBeVisible()
  await expect(note).toContainText(/sample|placeholder/i)
})
