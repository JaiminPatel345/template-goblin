/**
 * BUG-15 — Regression test (#144).
 *
 * Templates were stuck on the default `meta.name = 'Untitled Template'`
 * with no UI to rename. Added an inline editor in the top bar: click
 * to edit, Enter / blur commits, Esc reverts, empty value falls back
 * to the default.
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

test('BUG-15: clicking the template name lets the user rename in place', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  const button = page.locator('[data-testid="template-name-button"]')
  await expect(button).toHaveText(/Untitled Template/i)

  await button.click()
  const input = page.locator('[data-testid="template-name-input"]')
  await expect(input).toBeVisible()
  await input.fill('My Certificate')
  await input.press('Enter')

  await expect(page.locator('[data-testid="template-name-button"]')).toHaveText('My Certificate')

  const stored = await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { meta: { name: string } } }
    }
    const w = window as W
    return w.__templateStore?.getState().meta.name ?? null
  })
  expect(stored).toBe('My Certificate')
})
