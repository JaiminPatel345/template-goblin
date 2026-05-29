/**
 * #162 — 'Fit to data' button shrinks the table field's bounding
 * box to header + actual-row-count × row-height.
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

test('#162: Fit to data resizes the table field height to match placeholder rows', async ({
  page,
}) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { addField: (f: unknown) => void } }
      __uiStore?: {
        getState: () => {
          selectFields: (ids: string[]) => void
          setShowRightPanel: (b: boolean) => void
        }
      }
    }
    const w = window as W
    w.__uiStore!.getState().setShowRightPanel(true)
    w.__templateStore!.getState().addField({
      id: 'field-162',
      type: 'table',
      x: 10,
      y: 10,
      width: 200,
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
        columns: [{ key: 'a', label: 'A', width: 200, align: 'left' }],
        maxRows: 20,
        maxColumns: 5,
        multiPage: false,
        showHeader: true,
        fitToContent: true,
        rowStyle: {
          fontFamily: 'Helvetica',
          fontSize: 10,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#000',
          backgroundColor: null,
          borderWidth: 0,
          borderColor: null,
          paddingTop: 2,
          paddingBottom: 2,
          paddingLeft: 4,
          paddingRight: 4,
          align: 'left',
          verticalAlign: 'top',
        },
        headerStyle: {
          fontFamily: 'Helvetica',
          fontSize: 10,
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#000',
          backgroundColor: '#eee',
          borderWidth: 0,
          borderColor: null,
          paddingTop: 2,
          paddingBottom: 2,
          paddingLeft: 4,
          paddingRight: 4,
          align: 'left',
          verticalAlign: 'top',
        },
        oddRowStyle: null,
        evenRowStyle: null,
        cellStyle: { overflowMode: 'truncate' },
      },
    })
    w.__uiStore!.getState().selectFields(['field-162'])
  })

  // Wait for the right panel to render the button.
  const fitBtn = page.locator('[data-testid="table-fit-to-data"]')
  await expect(fitBtn).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(300)

  // Click via DOM dispatch so React's synthetic onClick fires reliably
  // (the .click() route sometimes races React hydration on first paint).
  await fitBtn.evaluate((el) => (el as HTMLButtonElement).click())

  // Wait for resize to flush. Header (14) + 3 rows × 14 = 56, well
  // under the authored 600.
  await page.waitForFunction(
    () => {
      type W = Window & {
        __templateStore?: {
          getState: () => { fields: Array<{ id: string; height: number }> }
        }
      }
      const w = window as W
      const h =
        w.__templateStore?.getState().fields.find((f) => f.id === 'field-162')?.height ?? 600
      return h < 600
    },
    { timeout: 3000 },
  )

  const newHeight = await page.evaluate(() => {
    type W = Window & {
      __templateStore?: {
        getState: () => { fields: Array<{ id: string; height: number }> }
      }
    }
    const w = window as W
    return w.__templateStore!.getState().fields.find((f) => f.id === 'field-162')?.height ?? -1
  })
  expect(newHeight).toBeGreaterThan(0)
  expect(newHeight).toBeLessThan(600)
})
