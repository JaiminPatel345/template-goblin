/**
 * #164 — Canvas area switches to a `crosshair` cursor while a
 * placing tool (Text / Image / Table) is active. The hint banner
 * from #134 is still in place; the cursor change reinforces it
 * across the whole canvas region.
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

async function cursorOnCanvasArea(page: Page): Promise<string> {
  return await page
    .locator('canvas')
    .first()
    .evaluate((el) => {
      // Walk up to the scroll-container that owns the cursor style.
      let node: HTMLElement | null = el as HTMLElement
      while (node) {
        const cs = window.getComputedStyle(node)
        if (cs.cursor && cs.cursor !== 'auto' && cs.cursor !== '') return cs.cursor
        node = node.parentElement
      }
      return 'auto'
    })
}

test('#164: cursor switches to crosshair when a placing tool is active', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // No active tool yet — cursor stays at the browser default.
  const idle = await cursorOnCanvasArea(page)
  expect(idle).not.toBe('crosshair')

  // Activate the Text tool.
  await page.locator('[data-testid="toolbar-tool-text"]').click()
  // Hint banner appears (from #134) AND cursor swaps to crosshair.
  await expect(page.locator('[data-testid="canvas-place-hint"]')).toBeVisible()
  expect(await cursorOnCanvasArea(page)).toBe('crosshair')

  // Toggle the tool off — cursor returns.
  await page.locator('[data-testid="toolbar-tool-text"]').click()
  await expect(page.locator('[data-testid="canvas-place-hint"]')).toHaveCount(0)
  expect(await cursorOnCanvasArea(page)).not.toBe('crosshair')
})
