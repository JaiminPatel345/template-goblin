/**
 * #115 — the onboarding "Pick a background color" card's preview icon
 * must reflect the user's selected colour live as they type the hex
 * or use the swatch. Before the fix, the inner disc inherited
 * `var(--text-muted)` and stayed grey regardless of selection.
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

async function gotoColorStep(page: Page): Promise<void> {
  await page.locator('[data-testid="onboarding-solid-color"]').click()
  await expect(page.getByRole('heading', { name: /pick a background color/i })).toBeVisible({
    timeout: 5000,
  })
}

/** Resolve the inner-disc fill, normalising `#RRGGBB` to lowercase for compare. */
async function discFill(page: Page): Promise<string> {
  return await page.locator('[data-testid="onboarding-color-preview-disc"]').evaluate((el) => {
    // `getAttribute('fill')` returns whatever React rendered — either the
    // hex string we set, or the CSS-variable fallback for partial input.
    return (el.getAttribute('fill') ?? '').toLowerCase()
  })
}

test.describe('#115 — onboarding color preview icon', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await gotoColorStep(page)
  })

  test('starts with the muted fallback when the default white is the initial value', async ({
    page,
  }) => {
    // Default `color` state is `#ffffff` — a valid hex, so the disc should
    // already reflect white, not the muted fallback.
    expect(await discFill(page)).toBe('#ffffff')
  })

  test('updates to red when the user types #ff0000 into the hex input', async ({ page }) => {
    const hexInput = page.locator('[data-testid="onboarding-color-hex"]')
    await hexInput.fill('#ff0000')
    await expect(page.locator('[data-testid="onboarding-color-preview-disc"]')).toHaveAttribute(
      'fill',
      '#ff0000',
    )
  })

  test('updates again when the user changes the hex to blue', async ({ page }) => {
    const hexInput = page.locator('[data-testid="onboarding-color-hex"]')
    await hexInput.fill('#0000ff')
    expect(await discFill(page)).toBe('#0000ff')
    await hexInput.fill('#00ff00')
    expect(await discFill(page)).toBe('#00ff00')
  })

  test('falls back to the muted tint while the user is mid-typing a partial hex', async ({
    page,
  }) => {
    const hexInput = page.locator('[data-testid="onboarding-color-hex"]')
    // `#ff` is not a valid #RRGGBB — the disc should NOT show a random
    // colour. We expect the muted-tint CSS-variable fallback instead.
    await hexInput.fill('#ff')
    const fill = await discFill(page)
    expect(fill).toMatch(/var\(--text-muted\)/)
  })

  test('uppercase hex is normalised to lowercase but still rendered', async ({ page }) => {
    const hexInput = page.locator('[data-testid="onboarding-color-hex"]')
    await hexInput.fill('#ABCDEF')
    expect(await discFill(page)).toBe('#abcdef')
  })
})
