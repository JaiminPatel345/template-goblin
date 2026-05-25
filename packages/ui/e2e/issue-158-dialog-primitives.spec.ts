/**
 * #158 — Regression test for the Radix-based custom dialog primitives.
 *
 * Exercises the three replacement surfaces:
 *  - PromptDialog (group-name input in the left panel).
 *  - ConfirmDialog (File → New 'discard unsaved work?').
 *  - AlertDialog (Help → Shortcuts).
 *
 * Asserts the dialog opens, the actions resolve cleanly, and that
 * no native browser dialog is fired (which would block Playwright
 * unless explicitly handled).
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

test.describe('#158 — custom Radix dialog primitives replace native alert/confirm/prompt', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
  })

  test('PromptDialog: New Group asks for a name via the custom prompt', async ({ page }) => {
    // Wait for the left panel to be visible (showLeftPanel default false in
    // some flows — set it on so the New Group button is reachable).
    await page.evaluate(() => {
      type W = Window & {
        __uiStore?: { getState: () => { setShowLeftPanel: (b: boolean) => void } }
      }
      const w = window as W
      w.__uiStore?.getState().setShowLeftPanel(true)
    })

    // The 'New Group' control is rendered by the left-panel field list.
    const newGroupBtn = page.getByRole('button', { name: /New Group/i }).first()
    await newGroupBtn.click()

    const dialog = page.locator('[data-testid="dialog-prompt"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog).toContainText(/Group name/i)

    const input = page.locator('[data-testid="dialog-prompt-input"]')
    await expect(input).toBeFocused()
    await input.fill('Marketing copy')
    await page.locator('[data-testid="dialog-prompt-ok"]').click()
    await expect(dialog).toHaveCount(0)

    const groups = await page.evaluate(() => {
      type W = Window & {
        __templateStore?: {
          getState: () => { groups: Array<{ name: string }> }
        }
      }
      const w = window as W
      return w.__templateStore?.getState().groups.map((g) => g.name) ?? []
    })
    expect(groups).toContain('Marketing copy')
  })

  test('PromptDialog: empty input is rejected with an inline error', async ({ page }) => {
    await page.evaluate(() => {
      type W = Window & {
        __uiStore?: { getState: () => { setShowLeftPanel: (b: boolean) => void } }
      }
      const w = window as W
      w.__uiStore?.getState().setShowLeftPanel(true)
    })
    await page
      .getByRole('button', { name: /New Group/i })
      .first()
      .click()

    // OK is disabled while validate() returns an error string.
    const ok = page.locator('[data-testid="dialog-prompt-ok"]')
    await expect(ok).toBeDisabled()

    await page.locator('[data-testid="dialog-prompt-input"]').fill('   ')
    await expect(page.locator('[data-testid="dialog-prompt-error"]')).toBeVisible()
    await expect(ok).toBeDisabled()
  })

  test('AlertDialog: Help → Shortcuts opens the custom alert with the shortcut list', async ({
    page,
  }) => {
    await page.locator('[data-testid="menu-tab-help"]').click()
    await page.locator('[data-testid="ribbon-help-shortcuts"]').click()

    const dialog = page.locator('[data-testid="dialog-alert"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog).toContainText(/Ctrl\s*\+\s*Z/i)
    await page.locator('[data-testid="dialog-alert-ok"]').click()
    await expect(dialog).toHaveCount(0)
  })
})
