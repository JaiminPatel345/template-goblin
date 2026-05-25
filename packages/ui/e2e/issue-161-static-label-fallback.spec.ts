/**
 * #161 — Regression test for the BUG-11 follow-up.
 *
 * When a text field has been flipped Dynamic → Static and its static
 * value is empty (no carried-over placeholder), the FIELDS list used
 * to fall back to '<static text>'. It now falls back to the memo'd
 * dynamic jsonKey (e.g. 'texts.student_name') so the user still has
 * a recognisable label.
 *
 * Driven through `setFieldMode` so we exercise the same path the UI's
 * Dynamic / Static toggle takes.
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

test('#161: static field with empty value shows the memo dynamic jsonKey, not <static text>', async ({
  page,
}) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Ensure the right panel (which renders the FIELDS list) is open.
  await page.evaluate(() => {
    type W = Window & {
      __uiStore?: { getState: () => { setShowRightPanel: (b: boolean) => void } }
    }
    const w = window as W
    w.__uiStore?.getState().setShowRightPanel(true)
  })

  // Seed a dynamic text field with jsonKey 'student_name' and an EMPTY
  // placeholder, then flip to Static. After the flip the static
  // `value` is empty (no placeholder to carry), so the label should
  // come from the memo.
  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: {
        getState: () => {
          addField: (f: unknown) => void
          setFieldMode: (id: string, mode: 'static' | 'dynamic') => void
        }
      }
    }
    const w = window as W
    const api = w.__templateStore!.getState()
    api.addField({
      id: 'field-161-static',
      type: 'text',
      x: 10,
      y: 10,
      width: 120,
      height: 24,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'dynamic', jsonKey: 'student_name', required: false, placeholder: '' },
      style: {},
    })
    w.__templateStore!.getState().setFieldMode('field-161-static', 'static')
  })

  // The field-list row should now read 'texts.student_name', not '<static text>'.
  const row = page.locator('.tg-field-item-key').filter({ hasText: /student_name/i })
  await expect(row.first()).toBeVisible()
  await expect(page.locator('.tg-field-item-key', { hasText: '<static text>' })).toHaveCount(0)
})
