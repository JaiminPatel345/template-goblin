/**
 * #114 — the onboarding colour step's primary action used to read
 * "Next: page size" which clipped to "Next: page si..." inside the
 * default `max-w-md` card. Shortened to "Next →"; this spec pins both
 * the new label AND that the rendered button has no clipped text on
 * the default viewport (scrollWidth must equal clientWidth — no
 * overflow being hidden by any ancestor).
 *
 * Same fix applied to the symmetric `AddPageDialog` button.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

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

/** True when an element's content fits within its box (no clipped text). */
async function isFullyRendered(page: Page, testid: string): Promise<boolean> {
  return await page.locator(`[data-testid="${testid}"]`).evaluate((el) => {
    return el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight
  })
}

test.describe('#114 — onboarding Next button label fits the card', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await page.locator('[data-testid="onboarding-solid-color"]').click()
    await expect(page.getByRole('heading', { name: /pick a background color/i })).toBeVisible({
      timeout: 5000,
    })
  })

  test('button reads "Next →" (shortened from the truncating "Next: page size")', async ({
    page,
  }) => {
    await expect(page.locator('[data-testid="onboarding-color-next"]')).toHaveText(/^Next →$/)
  })

  test('button content fits its box — no clipping at the default card width', async ({ page }) => {
    expect(await isFullyRendered(page, 'onboarding-color-next')).toBe(true)
  })

  test('button still works — clicking advances to the page-size step', async ({ page }) => {
    await page.locator('[data-testid="onboarding-color-next"]').click()
    await expect(page.getByRole('heading', { name: /choose page size/i })).toBeVisible()
  })

  test('button also fits on a narrower viewport (mobile-ish, 360px wide)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    expect(await isFullyRendered(page, 'onboarding-color-next')).toBe(true)
  })
})
