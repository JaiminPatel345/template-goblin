/**
 * UX-09 — Regression test (#155).
 *
 * Toolbar buttons that have a global keyboard shortcut now name the
 * shortcut in their tooltip text. This test asserts a sampling of
 * them. Existing tooltips that already named shortcuts (Save Ctrl+S,
 * Undo Ctrl+Z, Redo Ctrl+Shift+Z) are pinned by their respective
 * specs.
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

test('UX-09: keyboard shortcut hints appear in toolbar button tooltips', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // File ribbon — Open shows (Ctrl+O).
  await page.locator('[data-testid="menu-tab-file"]').click()
  const open = page.locator('[data-testid="toolbar-open"]')
  await open.hover()
  await expect(page.getByText(/Ctrl\+O/i).first()).toBeVisible({ timeout: 2000 })

  // View ribbon — zoom controls.
  await page.locator('[data-testid="menu-tab-view"]').click()
  await page.locator('[data-testid="ribbon-zoom-reset"]').hover()
  await expect(page.getByText(/Ctrl\+0/i).first()).toBeVisible({ timeout: 2000 })
})
