/**
 * #112 — custom page-dimension input validation.
 *
 * Bug repro:
 *   1. Onboarding → Solid Color → Next: page size
 *   2. Select "Custom"
 *   3. Enter `-100` in Width
 *   4. Click Apply  ← used to be accepted, app opened with a broken canvas
 *
 * Expectation now: the inline error chip surfaces a per-field message
 * ("Width must be at least 1 pt.") and the Apply button is disabled
 * until the user enters a value ≥ 1 in BOTH fields.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

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

async function gotoSizeStep(page: Page): Promise<void> {
  await page.locator('[data-testid="onboarding-solid-color"]').click()
  await page.locator('[data-testid="onboarding-color-next"]').click()
  await expect(page.getByRole('heading', { name: /choose page size/i })).toBeVisible({
    timeout: 5000,
  })
  // Select the "Custom" radio.
  await page.getByRole('radio', { name: /^Custom$/ }).check()
}

test.describe('#112 — onboarding page-size custom-dim validation', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await gotoSizeStep(page)
  })

  test('inline error appears + Apply disabled when Width is -100', async ({ page }) => {
    const widthInput = page.locator('[data-testid="page-size-custom-width"]')
    await widthInput.fill('-100')

    await expect(page.locator('[data-testid="page-size-width-error"]')).toContainText(
      /at least 1 pt/i,
    )
    await expect(page.locator('[data-testid="onboarding-color-apply"]')).toBeDisabled()
  })

  test('correcting the invalid width re-enables Apply and clears the error', async ({ page }) => {
    const widthInput = page.locator('[data-testid="page-size-custom-width"]')
    await widthInput.fill('-100')
    await expect(page.locator('[data-testid="onboarding-color-apply"]')).toBeDisabled()

    await widthInput.fill('595')
    await expect(page.locator('[data-testid="page-size-width-error"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="onboarding-color-apply"]')).toBeEnabled()
  })

  test('zero width is rejected the same as negative', async ({ page }) => {
    await page.locator('[data-testid="page-size-custom-width"]').fill('0')
    await expect(page.locator('[data-testid="page-size-width-error"]')).toContainText(
      /at least 1 pt/i,
    )
    await expect(page.locator('[data-testid="onboarding-color-apply"]')).toBeDisabled()
  })

  test('both fields invalid reports both errors', async ({ page }) => {
    await page.locator('[data-testid="page-size-custom-width"]').fill('-1')
    await page.locator('[data-testid="page-size-custom-height"]').fill('-1')
    await expect(page.locator('[data-testid="page-size-width-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="page-size-height-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="onboarding-color-apply"]')).toBeDisabled()
  })

  test('switching back to a preset clears the disabled-Apply state', async ({ page }) => {
    await page.locator('[data-testid="page-size-custom-width"]').fill('-100')
    await expect(page.locator('[data-testid="onboarding-color-apply"]')).toBeDisabled()
    await page.getByRole('radio', { name: /^A4/ }).check()
    await expect(page.locator('[data-testid="onboarding-color-apply"]')).toBeEnabled()
  })
})
