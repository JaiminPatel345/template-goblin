/**
 * UX-04 — Regression test (#150).
 *
 * Clicking File → New must prompt for confirmation before wiping the
 * current template. The handler in FileRibbon already calls
 * `window.confirm(...)`; this test stubs confirm to return false and
 * asserts the template state is left untouched.
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

test('UX-04: File → New is guarded by a confirm prompt', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Seed a field so we can prove state survived.
  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { addField: (f: unknown) => void } }
    }
    const w = window as W
    w.__templateStore?.getState().addField({
      id: 'field-ux04-anchor',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 30,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'keep me' },
      style: {},
    })
  })

  // Stub confirm() to decline. The handler in FileRibbon must early-
  // return without touching the store.
  await page.evaluate(() => {
    window.confirm = () => false
  })

  await page.locator('[data-testid="menu-tab-file"]').click()
  await page.locator('[data-testid="toolbar-new"]').click()

  const survives = await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { fields: Array<{ id: string }> } }
    }
    const w = window as W
    return (w.__templateStore?.getState().fields ?? []).some((f) => f.id === 'field-ux04-anchor')
  })
  expect(survives).toBe(true)
})
