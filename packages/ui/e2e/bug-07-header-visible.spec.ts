/**
 * BUG-07 — Regression test (#136).
 *
 * Enabling the header via Insert → Header set `header.enabled === true`
 * in the store but the canvas showed (effectively) no header zone — the
 * editor-only hint was a near-invisible 0.5 px dashed stroke on a
 * transparent fill. Users couldn't tell a band had been enabled at
 * all.
 *
 * Fix: when the band has no explicit backgroundColor, paint a tinted
 * editor-only zone + a visible dashed border (excludeFromExport: true
 * keeps the hint out of the PDF). This test asserts that after
 * enabling the header through the store, the Fabric canvas carries
 * at least one __isBand object whose fill / stroke is visibly tinted.
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

test('BUG-07: enabling header produces a visibly tinted band on the canvas', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Enable header via the store (UI path opens a modal — we exercise the
  // underlying state directly to keep this focused on the renderer fix).
  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { setHeaderEnabled: (b: boolean) => void } }
    }
    const w = window as W
    w.__templateStore?.getState().setHeaderEnabled(true)
  })

  // Wait for useBandVisuals to flush.
  await page.waitForFunction(
    () => {
      type W = Window & {
        __fabricCanvas?: {
          getObjects: () => Array<{
            __isBand?: boolean
            fill?: unknown
            stroke?: unknown
            strokeWidth?: number
          }>
        }
      }
      const w = window as W
      const objs = w.__fabricCanvas?.getObjects() ?? []
      return objs.some((o) => o.__isBand === true)
    },
    { timeout: 3000 },
  )

  const band = await page.evaluate(() => {
    type W = Window & {
      __fabricCanvas?: {
        getObjects: () => Array<{
          __isBand?: boolean
          fill?: unknown
          stroke?: unknown
          strokeWidth?: number
          height?: number
        }>
      }
    }
    const w = window as W
    const objs = w.__fabricCanvas?.getObjects() ?? []
    const bg = objs.find((o) => o.__isBand === true && typeof o.height === 'number')
    return bg
      ? {
          height: bg.height,
          fill: typeof bg.fill === 'string' ? bg.fill : '',
          stroke: typeof bg.stroke === 'string' ? bg.stroke : '',
          strokeWidth: bg.strokeWidth ?? 0,
        }
      : null
  })

  expect(band).not.toBeNull()
  expect(band!.height).toBeGreaterThan(0)
  // Either a real bg colour OR the editor-only tint with a visible dashed stroke.
  const hasVisibleFill = band!.fill !== '' && band!.fill !== 'rgba(0,0,0,0)'
  const hasVisibleStroke = band!.stroke !== '' && band!.strokeWidth >= 1
  expect(hasVisibleFill || hasVisibleStroke).toBe(true)
})
