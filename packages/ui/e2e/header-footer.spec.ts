/**
 * E2E coverage for #61 — page-wide header / footer / page-number.
 *
 * Verifies the round-trip from the right-panel UI through the store to the
 * Fabric canvas:
 *   - The Page Layout panel appears when nothing is selected.
 *   - Enabling the footer paints a `__isBand` rectangle at the bottom edge.
 *   - Enabling the page-number toggle paints a `Textbox` page number inside
 *     the chosen band.
 *   - `applyToFirstPage = false` removes the band visual on page index 0.
 *
 * The PDF render path itself is unit-tested in `core/tests/bands.test.ts` so
 * we do NOT also render through the preview popup here — the canvas-side
 * checks are what would have caught regressions in earlier rounds.
 *
 * Strategy: instead of completing the multi-step onboarding flow (which
 * has shifted since other spec files were written), we pre-seed the
 * IndexedDB-backed store with a minimal valid template so the canvas
 * mounts directly. Keeps the spec resilient to onboarding UX changes.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

/**
 * Pre-seed IndexedDB with a minimal valid template state so the app
 * bypasses onboarding and mounts the canvas immediately. The shape
 * mirrors the persist `partialize` block in `templateStore.ts`.
 */
async function clearStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('template-goblin-template')
    localStorage.removeItem('template-goblin-ui')
    try {
      indexedDB.deleteDatabase('template-goblin')
    } catch {
      // ignore
    }
  })
}

/**
 * Drive the current onboarding flow: "Solid color" → pick hex → Next →
 * Page size dialog → Apply. Captures the post-onboarding state where the
 * canvas is up and nothing is selected.
 */
async function completeOnboarding(page: Page): Promise<void> {
  await page.locator('button', { hasText: /^Solid color$/ }).click()
  // The color picker reveals a hex textbox. Accept the default white.
  await page.locator('button', { hasText: /^Next →$/ }).click()
  // Page size dialog auto-selects A4 by default → click Apply / Continue.
  await expect(page.getByRole('heading', { name: /choose page size/i })).toBeVisible({
    timeout: 5000,
  })
  // Confirm button label varies — try Apply, then Continue / Next.
  const confirm = page.getByRole('button', { name: /^(Apply|Continue|Next|Done)$/i }).first()
  await confirm.click()
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

interface BandObjectSummary {
  isBand: boolean
  isBandField: boolean
  type: string
  top: number
  height: number
  isTextbox: boolean
}

/** Snapshot every Fabric object that looks like a band visual. */
async function bandObjects(page: Page): Promise<BandObjectSummary[]> {
  return await page.evaluate(() => {
    interface FabricLike {
      getObjects(): Array<{
        __isBand?: boolean
        __isBandField?: boolean
        type?: string
        top?: number
        height?: number
        constructor: { name: string }
      }>
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) return []
    return fc
      .getObjects()
      .filter((o) => o.__isBand === true || o.__isBandField === true)
      .map((o) => ({
        isBand: !!o.__isBand,
        isBandField: !!o.__isBandField,
        type: o.type ?? '',
        top: o.top ?? 0,
        height: o.height ?? 0,
        // Fabric tags each class with a lowercase `type`; Textbox extends
        // IText/Text. Constructor name is mangled under prod bundling, so
        // we match either the Fabric type string or the bundled name.
        isTextbox: (o.type ?? '').toLowerCase() === 'textbox' || o.constructor.name === 'Textbox',
      }))
  })
}

async function waitForCanvas(page: Page): Promise<void> {
  await expect(fabricCanvas(page)).toBeVisible({ timeout: 10000 })
  await expect
    .poll(
      () =>
        page.evaluate(() => !!(window as unknown as { __fabricCanvas?: unknown }).__fabricCanvas),
      { timeout: 10000 },
    )
    .toBe(true)
}

test.describe('#61 — Page Layout dialog + band visuals', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await completeOnboarding(page)
    await waitForCanvas(page)
  })

  /** Switch to the Insert tab so the Header / Footer / Page Number toggles
   *  surface in the ribbon. The navbar redesign (#128) replaced the old
   *  anchored Page Layout menu with three direct toggles + per-band ⚙. */
  async function openInsertTab(page: Page): Promise<void> {
    await page.locator('[data-testid="menu-tab-insert"]').click()
    await expect(page.locator('[data-testid="ribbon-insert-header"]')).toBeVisible({
      timeout: 3000,
    })
  }

  test('Insert ribbon surfaces Header / Footer / Page Number as direct toggles', async ({
    page,
  }) => {
    await openInsertTab(page)
    await expect(page.locator('[data-testid="ribbon-insert-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="ribbon-insert-footer"]')).toBeVisible()
    await expect(page.locator('[data-testid="ribbon-insert-pagenumber"]')).toBeVisible()
    // Each toggle has its own ⚙ settings affordance.
    await expect(page.locator('[data-testid="ribbon-insert-header-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="ribbon-insert-footer-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="ribbon-insert-pagenumber-settings"]')).toBeVisible()
  })

  test('Header toggle paints a band on the canvas in one click', async ({ page }) => {
    expect((await bandObjects(page)).filter((o) => o.isBand)).toHaveLength(0)
    await openInsertTab(page)
    await page.locator('[data-testid="ribbon-insert-header"]').click()
    await expect
      .poll(async () => (await bandObjects(page)).filter((o) => o.isBand).length, {
        timeout: 3000,
      })
      .toBeGreaterThan(0)
  })

  test('Header ⚙ opens the full configuration modal', async ({ page }) => {
    await openInsertTab(page)
    await page.locator('[data-testid="ribbon-insert-header-settings"]').click()
    await expect(page.locator('[data-testid="band-settings-modal"]')).toBeVisible()
    await expect(page.locator('text=Apply to first page')).toBeVisible()
  })

  test('Page Number toggle paints a Textbox once enabled', async ({ page }) => {
    await openInsertTab(page)
    // Enabling page number with default placement=footer auto-enables
    // the footer band (#61 follow-up).
    await page.locator('[data-testid="ribbon-insert-pagenumber"]').click()
    await expect
      .poll(async () => (await bandObjects(page)).filter((o) => o.isBand && o.isTextbox).length, {
        timeout: 3000,
      })
      .toBeGreaterThan(0)
  })

  test('applyToFirstPage = false (set via Settings modal) removes the band on page 0', async ({
    page,
  }) => {
    await openInsertTab(page)
    await page.locator('[data-testid="ribbon-insert-header"]').click()
    await expect
      .poll(async () => (await bandObjects(page)).filter((o) => o.isBand).length, {
        timeout: 3000,
      })
      .toBeGreaterThan(0)
    await page.locator('[data-testid="ribbon-insert-header-settings"]').click()
    await expect(page.locator('[data-testid="band-settings-modal"]')).toBeVisible()
    // Uncheck "Apply to first page" inside the modal.
    await page
      .locator('.tg-toggle-row', { hasText: 'Apply to first page' })
      .locator('input[type="checkbox"]')
      .uncheck()
    await expect
      .poll(async () => (await bandObjects(page)).filter((o) => o.isBand).length, {
        timeout: 3000,
      })
      .toBe(0)
  })
})
