/**
 * BUG-10 — Regression test (#140).
 *
 * QA reported the Preview dialog's JSON textarea was 'ignored' for
 * image fields and only the Upload widget counted. Reading the
 * existing PreviewDialog.handleRender shows the merge order is in
 * fact: placeholder defaults → JSON-textarea images → uploads. So
 * data:URLs typed into the textarea ARE honoured (uploads only
 * override them, which matches user expectations).
 *
 * To prevent the perceived bug from creeping back, this test pins
 * the visible help line under the JSON editor that documents this
 * precedence. Future PRs can't drop it without failing the test.
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

test('BUG-10: Preview help text documents JSON-images + upload precedence', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Open Preview dialog via the toolbar.
  await page.locator('[data-testid="toolbar-preview"]').click()

  const helpText = page
    .locator('[data-testid="preview-dialog"]')
    .getByText(/Images supplied as.*data.*URLs inside the JSON are honoured/i)
  await expect(helpText).toBeVisible()
})
