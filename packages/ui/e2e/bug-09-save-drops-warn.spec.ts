/**
 * BUG-09 — Regression test (#137).
 *
 * saveTemplate used to silently drop fields with missing `source`
 * (just a console.warn). The user only saw a successful download
 * even though some fields disappeared. Now saveTemplate returns
 * { droppedFieldIds } and the Save button's handler shows a window
 * alert listing what was lost.
 *
 * This test stubs window.alert, seeds a legacy field, clicks Save,
 * and asserts the alert text mentions the dropped field id.
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

test('BUG-09: saving with a no-source field surfaces a user-visible alert', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Capture window.alert text into the page so the test can read it back.
  await page.evaluate(() => {
    type W = Window & { __lastAlert?: string }
    const w = window as W
    w.alert = (msg?: string) => {
      w.__lastAlert = msg ?? ''
    }
  })

  // Seed a legacy (no-source) field.
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
  // The Save button triggers an async chain; give the alert a moment.
  await page.waitForFunction(
    () => {
      type W = Window & { __lastAlert?: string }
      return typeof (window as W).__lastAlert === 'string'
    },
    { timeout: 5000 },
  )

  const alertText = await page.evaluate(() => {
    type W = Window & { __lastAlert?: string }
    return (window as W).__lastAlert ?? ''
  })

  expect(alertText).toMatch(/could not be written|outdated format/i)
  expect(alertText).toContain('field-bug09-legacy')
})
