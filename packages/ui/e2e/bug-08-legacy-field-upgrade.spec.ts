/**
 * BUG-08 — Regression test (#139).
 *
 * Fields rehydrated from an older shape (no `source` object) used to
 * show a 'cannot be edited' stub with no recovery path. Now each
 * field-type panel surfaces a 'Convert to new format' button that
 * injects the default dynamic source and brings the field back to
 * full editability.
 *
 * This test seeds a text field with no source via the store, selects
 * it, clicks the upgrade button, and asserts the field gains a
 * dynamic source.
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

test('BUG-08: legacy text field offers a Convert button that adds a source', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Seed a legacy (no-source) text field directly and select it.
  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: {
        getState: () => { addField: (f: unknown) => void }
      }
      __uiStore?: {
        getState: () => { selectFields: (ids: string[]) => void }
      }
    }
    const w = window as W
    const id = 'field-bug08-legacy'
    w.__templateStore?.getState().addField({
      id,
      type: 'text',
      x: 50,
      y: 50,
      width: 100,
      height: 30,
      zIndex: 0,
      pageId: null,
      groupId: null,
      // no source on purpose — simulates the legacy shape
      style: {},
    })
    w.__uiStore?.getState().selectFields([id])
  })

  await expect(page.locator('[data-testid="legacy-field-upgrade"]')).toBeVisible()
  await page.locator('[data-testid="legacy-field-upgrade-text"]').click()

  const source = await page.evaluate(() => {
    type W = Window & {
      __templateStore?: {
        getState: () => {
          fields: Array<{ id: string; source?: { mode?: string } }>
        }
      }
    }
    const w = window as W
    return (
      w.__templateStore?.getState().fields.find((f) => f.id === 'field-bug08-legacy')?.source ??
      null
    )
  })
  expect(source).not.toBeNull()
  expect(source?.mode).toBe('dynamic')
})
