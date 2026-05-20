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
  await page.locator('button', { hasText: /^Next: page size$/ }).click()
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
    // Open the Page Layout dialog before every band-toggle test. The toggles
    // live inside the modal now (Word / Google Docs "Insert → Header &
    // Footer" pattern), not the sidebar.
    await page.locator('[data-testid="toolbar-page-layout"]').click()
    await expect(page.locator('[data-testid="page-layout-dialog"]')).toBeVisible({
      timeout: 3000,
    })
  })

  test('toolbar button opens a Page Layout dialog with band controls', async ({ page }) => {
    await expect(page.locator('text=Enable header')).toBeVisible()
    await expect(page.locator('text=Enable footer')).toBeVisible()
    await expect(page.locator('text=Show page number')).toBeVisible()
  })

  test('sidebar empty state no longer shows Page Layout content', async ({ page }) => {
    // Close the dialog and verify the left properties panel went back to
    // the field-selection placeholder.
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.locator('[data-testid="page-layout-dialog"]')).toBeHidden()
    await expect(page.locator('text=Select a field to edit its properties')).toBeVisible()
    // Confirm the band controls are NOT in the sidebar.
    await expect(page.locator('text=Enable header')).toBeHidden()
  })

  /**
   * Find the checkbox whose label text matches `labelText`. The form rows
   * render as `<div class="tg-toggle-row"><label>X</label><input type=...>`.
   */
  function checkboxByLabel(page: Page, labelText: string) {
    return page.locator('.tg-toggle-row', { hasText: labelText }).locator('input[type="checkbox"]')
  }

  test('Enabling the footer paints a band rectangle on the canvas', async ({ page }) => {
    expect((await bandObjects(page)).filter((o) => o.isBand)).toHaveLength(0)

    await checkboxByLabel(page, 'Enable footer').check()

    await expect
      .poll(async () => (await bandObjects(page)).filter((o) => o.isBand).length, {
        timeout: 3000,
      })
      .toBeGreaterThan(0)
  })

  test('Enabling Show Page Number paints a Textbox inside the chosen band', async ({ page }) => {
    await checkboxByLabel(page, 'Enable footer').check()
    await checkboxByLabel(page, 'Show page number').check()
    // Default config has `showOnFirstPage: false`; our test template only
    // has a single page (index 0), so we patch the store directly to
    // override that default. Setting via UI is fragile because the
    // "Show on first page" label sits in a different section that may not
    // be visible until the user scrolls / the layout reflows.
    await page.evaluate(() => {
      interface StoreLike {
        getState(): { setPageNumberConfig: (p: { showOnFirstPage: boolean }) => void }
      }
      const store = (window as unknown as { __templateStore?: StoreLike }).__templateStore
      store?.getState().setPageNumberConfig({ showOnFirstPage: true })
    })

    await expect
      .poll(async () => (await bandObjects(page)).filter((o) => o.isBand && o.isTextbox).length, {
        timeout: 3000,
      })
      .toBeGreaterThan(0)
  })

  test('applyToFirstPage = false removes the band on page index 0', async ({ page }) => {
    await checkboxByLabel(page, 'Enable header').check()

    await expect
      .poll(async () => (await bandObjects(page)).filter((o) => o.isBand).length, {
        timeout: 3000,
      })
      .toBeGreaterThan(0)

    // "Apply to first page" is the second toggle row that appears once
    // header is enabled — disambiguate by its label.
    await checkboxByLabel(page, 'Apply to first page').uncheck()

    await expect
      .poll(async () => (await bandObjects(page)).filter((o) => o.isBand).length, {
        timeout: 3000,
      })
      .toBe(0)
  })
})
