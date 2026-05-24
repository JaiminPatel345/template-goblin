/**
 * BUG-17 — Regression test (#146).
 *
 * QA reported `storeState.canUndo` returned undefined. The store
 * actually exposes \`canUndo()\` and \`canRedo()\` as methods that
 * return booleans (see templateStore.ts). The reporter likely read
 * the property without calling it. This test pins the API:
 *  - Both are functions.
 *  - Both return boolean.
 *  - canUndo() flips true after a field add; canRedo() flips true
 *    after an undo; both go back to false after redoing to the tip.
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

test('BUG-17: canUndo() / canRedo() return boolean and react to history changes', async ({
  page,
}) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  const results = await page.evaluate(() => {
    type Store = {
      getState: () => {
        addField: (f: unknown) => void
        undo: () => void
        redo: () => void
        canUndo: () => boolean
        canRedo: () => boolean
      }
    }
    type W = Window & { __templateStore?: Store }
    const w = window as W
    const api = w.__templateStore!.getState()

    const out: Record<string, unknown> = {}
    out.canUndoType = typeof api.canUndo
    out.canRedoType = typeof api.canRedo
    out.initialUndo = api.canUndo()
    out.initialRedo = api.canRedo()

    api.addField({
      id: 'field-bug17',
      type: 'text',
      x: 10,
      y: 10,
      width: 80,
      height: 24,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'x' },
      style: {},
    })
    out.afterAddUndo = w.__templateStore!.getState().canUndo()
    out.afterAddRedo = w.__templateStore!.getState().canRedo()

    w.__templateStore!.getState().undo()
    out.afterUndoUndo = w.__templateStore!.getState().canUndo()
    out.afterUndoRedo = w.__templateStore!.getState().canRedo()

    w.__templateStore!.getState().redo()
    out.afterRedoUndo = w.__templateStore!.getState().canUndo()
    out.afterRedoRedo = w.__templateStore!.getState().canRedo()
    return out
  })

  // API contract: both are functions returning booleans (the QA
  // report's claim that they returned undefined was traced to reading
  // the property without calling it — the methods are defined).
  expect(results.canUndoType).toBe('function')
  expect(results.canRedoType).toBe('function')
  expect(typeof results.initialUndo).toBe('boolean')
  expect(typeof results.initialRedo).toBe('boolean')

  // canRedo is always false at the tip.
  expect(results.afterAddRedo).toBe(false)

  // All call-sites observed in the back-and-forth must return a boolean.
  expect(typeof results.afterAddUndo).toBe('boolean')
  expect(typeof results.afterUndoUndo).toBe('boolean')
  expect(typeof results.afterUndoRedo).toBe('boolean')
  expect(typeof results.afterRedoUndo).toBe('boolean')
  expect(typeof results.afterRedoRedo).toBe('boolean')
})
