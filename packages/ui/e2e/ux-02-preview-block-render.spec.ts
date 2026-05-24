/**
 * UX-02 — Regression test (#148).
 *
 * The Preview Render button used to fire even when required dynamic
 * fields had no value, and the user only saw the failure as a runtime
 * SDK error after clicking. Now Render is disabled until every
 * required dynamic field is satisfied (either in the JSON textarea or
 * by an explicit upload).
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

test('UX-02: Render is disabled when required image field has no upload + no JSON value', async ({
  page,
}) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Seed a required dynamic image field.
  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { addField: (f: unknown) => void } }
    }
    const w = window as W
    w.__templateStore?.getState().addField({
      id: 'field-ux02-photo',
      type: 'image',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'dynamic', jsonKey: 'student_photo', required: true, placeholder: null },
      style: {},
    })
  })

  await page.locator('[data-testid="toolbar-preview"]').click()

  const render = page.locator('[data-testid="preview-render"]')
  // Wipe the JSON textarea to a minimal empty shape — no image entry.
  const editor = page.locator('[data-testid="preview-json-editor"]')
  await editor.fill('{ "texts": {}, "tables": {}, "images": {}, "links": {} }')
  await expect(render).toBeDisabled()
})
