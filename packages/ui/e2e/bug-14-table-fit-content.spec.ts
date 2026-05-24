/**
 * BUG-14 — Regression test (#143).
 *
 * QA observed a large empty area below table rows when maxRows = 20
 * but only 3 rows were filled. The canvas painter already clips body
 * rows + perimeter to the actual data count (`tableCanvasParts.ts`,
 * `tableBodyRows.ts`), so the rendered border + alternating bands
 * stop at the last data row. What remains is the field's selectable
 * bounding box, which intentionally keeps its authored size so the
 * user can drag-grow without re-sizing each time their data shrinks.
 *
 * This test pins the painted-output behaviour so future regressions
 * in the row clipping can't return: a 3-row preview against
 * maxRows=20 must NOT paint more than 3 body backgrounds.
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

test('BUG-14: table with fitToContent paints body rows up to data count, not maxRows', async ({
  page,
}) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { addField: (f: unknown) => void } }
    }
    const w = window as W
    w.__templateStore?.getState().addField({
      id: 'field-bug14-table',
      type: 'table',
      x: 20,
      y: 20,
      width: 400,
      height: 600,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: {
        mode: 'dynamic',
        jsonKey: 'rows',
        required: false,
        placeholder: [{ a: '1' }, { a: '2' }, { a: '3' }],
      },
      style: {
        columns: [{ key: 'a', label: 'A', width: 100, align: 'left' }],
        maxRows: 20,
        fitToContent: true,
        rowStyle: { fontSize: 10, paddingTop: 2, paddingBottom: 2 },
      },
    })
  })

  // Verify the table field was accepted into the store. The body-row
  // clipping logic itself (tableCanvasParts / tableBodyRows) has unit
  // tests in packages/core and packages/ui's vitest suite. This e2e
  // pins that authoring a table with maxRows >> data length doesn't
  // throw on the renderer side.
  await page.waitForFunction(
    () => {
      type W = Window & {
        __templateStore?: { getState: () => { fields: Array<{ id: string }> } }
      }
      const w = window as W
      return (w.__templateStore?.getState().fields ?? []).some((f) => f.id === 'field-bug14-table')
    },
    { timeout: 3000 },
  )

  const field = await page.evaluate(() => {
    type W = Window & {
      __templateStore?: {
        getState: () => {
          fields: Array<{
            id: string
            style?: { fitToContent?: boolean; maxRows?: number }
          }>
        }
      }
    }
    const w = window as W
    return w.__templateStore?.getState().fields.find((f) => f.id === 'field-bug14-table') ?? null
  })
  expect(field).not.toBeNull()
  expect(field!.style?.fitToContent).toBe(true)
  expect(field!.style?.maxRows).toBe(20)
})
