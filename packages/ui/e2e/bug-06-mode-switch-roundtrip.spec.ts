/**
 * BUG-06 — Regression test (#135).
 *
 * Flipping a text field Dynamic → Static → Dynamic used to drop the
 * user's jsonKey (regenerated as `text_N`) and reset Required to false.
 * `setFieldMode` now memoises the dynamic-side metadata per-field so
 * round-trips restore the original values.
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

test('BUG-06: Dynamic → Static → Dynamic preserves jsonKey and required', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Seed a dynamic text field directly through the store, then flip its
  // mode twice through the same store action the UI calls.
  const result = await page.evaluate(() => {
    type Source =
      | { mode: 'static'; value: unknown }
      | { mode: 'dynamic'; jsonKey: string; required: boolean; placeholder: unknown }
    type Field = { id: string; type: 'text'; source: Source }
    type Store = {
      getState: () => {
        fields: Field[]
        addField: (f: Field) => void
        setFieldMode: (id: string, mode: 'static' | 'dynamic') => void
      }
    }
    type W = Window & { __templateStore?: Store }
    const w = window as W
    const api = w.__templateStore?.getState()
    if (!api) return null

    const id = 'field-bug06-test'
    api.addField({
      id,
      type: 'text',
      source: {
        mode: 'dynamic',
        jsonKey: 'student_name',
        required: true,
        placeholder: 'Sample',
      },
    } as unknown as Field)

    // Flip → static
    w.__templateStore!.getState().setFieldMode(id, 'static')
    // Flip → dynamic
    w.__templateStore!.getState().setFieldMode(id, 'dynamic')

    const after = w.__templateStore!.getState().fields.find((f) => f.id === id)
    return after?.source ?? null
  })

  expect(result).not.toBeNull()
  expect(result?.mode).toBe('dynamic')
  if (result?.mode === 'dynamic') {
    expect(result.jsonKey).toBe('student_name')
    expect(result.required).toBe(true)
  }
})
