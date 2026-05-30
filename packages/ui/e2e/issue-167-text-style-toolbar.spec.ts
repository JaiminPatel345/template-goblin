/**
 * #167 — Word-style B / I / U / S toggles, the floating selection toolbar,
 * and text background colour.
 *
 * Coverage (acceptance criteria):
 *   1. B / I / U / S toggles in the right panel write through to the field's
 *      style; underline and strikethrough are mutually exclusive.
 *   2. The Format ribbon's Text-style group is selection-aware (disabled with
 *      no selection) and stays in sync with the panel + floating toolbar.
 *   3. The floating selection toolbar appears for a selected text field, its
 *      toggles work, the eye-off button hides it, and the hidden state
 *      survives reselect AND a full page reload (persisted via uiStore).
 *   4. Text background colour round-trips through the store.
 *   5. The floating toolbar re-anchors when the canvas zoom changes.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

interface TextStyle {
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline' | 'line-through'
  backgroundColor?: string | null
}

declare global {
  interface Window {
    __templateStore: {
      getState: () => {
        addField: (f: unknown) => void
        fields: { id: string; style: TextStyle }[]
      }
    }
    __uiStore: {
      getState: () => {
        selectFields: (ids: string[]) => void
        clearSelection: () => void
        setActiveMenuTab: (t: string) => void
        setRibbonCollapsed: (c: boolean) => void
        setZoom: (z: number) => void
        showSelectionToolbar: boolean
      }
    }
    __fabricCanvas: {
      getObjects: () => { __fieldId?: string; getObjects?: () => { fill?: unknown }[] }[]
    }
  }
}

/** Read the fill of a field group's background rect (its first child). */
async function readBgRectFill(page: Page, id = 'f-style'): Promise<unknown> {
  return page.evaluate((fid) => {
    const g = window.__fabricCanvas.getObjects().find((o) => o.__fieldId === fid)
    const rect = g?.getObjects?.()[0]
    return rect?.fill ?? null
  }, id)
}

/**
 * Clear persisted state ONCE (via evaluate, not addInitScript) so a later
 * `page.reload()` in the persistence test does NOT re-wipe storage — that is
 * the whole point of that test.
 */
async function clearStorage(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    try {
      indexedDB.deleteDatabase('template-goblin')
    } catch {
      /* ignore */
    }
  })
  await page.reload()
}

async function onboardSolidColor(page: Page): Promise<void> {
  await page.locator('[data-testid="onboarding-solid-color"]').click()
  await page.getByRole('button', { name: /Next/i }).click()
  await page.getByRole('button', { name: /Apply/i }).click()
}

async function seedTextField(page: Page, id = 'f-style'): Promise<void> {
  await page.evaluate((fid) => {
    window.__templateStore.getState().addField({
      id: fid,
      type: 'text',
      x: 100,
      y: 120,
      width: 180,
      height: 50,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'style me' },
      style: {
        fontId: null,
        fontFamily: 'Helvetica',
        fontSize: 12,
        fontSizeMin: 11,
        lineHeight: 1.2,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        backgroundColor: null,
        align: 'left',
        verticalAlign: 'top',
        maxRows: 3,
        overflowMode: 'truncate',
        snapToGrid: true,
      },
    })
  }, id)
}

async function selectField(page: Page, id = 'f-style'): Promise<void> {
  await page.evaluate((fid) => window.__uiStore.getState().selectFields([fid]), id)
}

async function readStyle(page: Page, id = 'f-style'): Promise<TextStyle | null> {
  return page.evaluate((fid) => {
    const f = window.__templateStore.getState().fields.find((x) => x.id === fid)
    return f ? f.style : null
  }, id)
}

async function bootstrap(page: Page): Promise<void> {
  // A tall viewport so the left panel's lower controls (Style row, Background
  // row) sit comfortably above the fold without a scroll-into-view.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await clearStorage(page)
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
  await seedTextField(page)
  await selectField(page)
  // Wait for the selection to fully process (toolbar mounts) and for the
  // left panel to settle — it can reflow once right after selection, which
  // would otherwise shift a control out from under an in-flight click.
  await expect(page.getByTestId('floating-selection-toolbar')).toBeVisible()
  // #159: a mousedown anywhere outside the toolbar shell (e.g. a left-panel
  // control) collapses the ribbon, which reflows the layout. A synthetic
  // click straddling that reflow loses its mouseup, so collapse the ribbon
  // up front — then panel clicks land deterministically. (Real fast clicks
  // survive the reflow; this only de-flakes the test's slower gesture.)
  await page.evaluate(() => window.__uiStore.getState().setRibbonCollapsed(true))
  await waitForStablePanel(page)
}

/** Poll until panel-bold's top stops moving for a few consecutive frames. */
async function waitForStablePanel(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="panel-bold"]')
    if (!el) return false
    const w = window as unknown as { __py?: number; __stable?: number }
    const y = Math.round(el.getBoundingClientRect().top)
    w.__stable = w.__py === y ? (w.__stable ?? 0) + 1 : 0
    w.__py = y
    return (w.__stable ?? 0) >= 3
  })
}

test.describe('#167 — text style toggles, floating toolbar, background colour', () => {
  test('right-panel B/I/U/S toggles write through to the field style', async ({ page }) => {
    await bootstrap(page)

    const bold = page.getByTestId('panel-bold')
    const italic = page.getByTestId('panel-italic')
    const underline = page.getByTestId('panel-underline')
    const strike = page.getByTestId('panel-strike')
    await expect(bold).toBeVisible()

    await bold.click()
    await expect.poll(async () => (await readStyle(page))?.fontWeight).toBe('bold')
    await expect(bold).toHaveAttribute('aria-pressed', 'true')

    await italic.click()
    await expect.poll(async () => (await readStyle(page))?.fontStyle).toBe('italic')

    await underline.click()
    await expect.poll(async () => (await readStyle(page))?.textDecoration).toBe('underline')

    // Strikethrough and underline share textDecoration — turning S on clears U.
    await strike.click()
    await expect.poll(async () => (await readStyle(page))?.textDecoration).toBe('line-through')
    await expect(underline).toHaveAttribute('aria-pressed', 'false')

    // Clicking an active toggle turns it back off.
    await bold.click()
    await expect.poll(async () => (await readStyle(page))?.fontWeight).toBe('normal')
  })

  test('Format ribbon Text-style group is selection-aware and stays in sync', async ({ page }) => {
    await bootstrap(page)
    await page.evaluate(() => window.__uiStore.getState().setActiveMenuTab('format'))

    const ribbonBold = page.getByTestId('ribbon-bold')
    await expect(ribbonBold).toBeVisible()
    await expect(ribbonBold).toBeEnabled()

    // Toggle bold from the ribbon; the panel + floating toolbar reflect it.
    await ribbonBold.click()
    await expect.poll(async () => (await readStyle(page))?.fontWeight).toBe('bold')
    await expect(page.getByTestId('panel-bold')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('toolbar-bold')).toHaveAttribute('aria-pressed', 'true')

    // With nothing selected the ribbon toggles disable.
    await page.evaluate(() => window.__uiStore.getState().clearSelection())
    await expect(ribbonBold).toBeDisabled()
  })

  test('floating toolbar appears, toggles work, and the eye hides it (persists on reload)', async ({
    page,
  }) => {
    await bootstrap(page)

    const toolbar = page.getByTestId('floating-selection-toolbar')
    await expect(toolbar).toBeVisible()

    await page.getByTestId('toolbar-italic').click()
    await expect.poll(async () => (await readStyle(page))?.fontStyle).toBe('italic')

    // Eye-off hides the toolbar.
    await page.getByTestId('toolbar-hide').click()
    await expect(toolbar).toBeHidden()
    await expect
      .poll(() => page.evaluate(() => window.__uiStore.getState().showSelectionToolbar))
      .toBe(false)

    // Reselecting does not bring it back.
    await page.evaluate(() => window.__uiStore.getState().clearSelection())
    await selectField(page)
    await expect(toolbar).toBeHidden()

    // The hidden preference survives a full reload (persisted via uiStore in
    // localStorage). Assert the persisted flag directly — the reliable proof
    // of "persists across reloads" without depending on canvas rehydration.
    await page.reload()
    await expect
      .poll(() => page.evaluate(() => window.__uiStore.getState().showSelectionToolbar), {
        timeout: 10000,
      })
      .toBe(false)
  })

  test('text background colour round-trips through the store and canvas', async ({ page }) => {
    await bootstrap(page)

    // The Background row shows ONLY a swatch — clicking it opens the picker;
    // the transparent ("no fill") option lives inside that popover, with no
    // separate Clear/Color button beside the swatch.
    const bgRow = page.locator('.tg-form-row', { hasText: 'Background' })
    await bgRow.getByTestId('color-picker-swatch').click()
    await page.getByTestId('color-picker-preset-#ef4444').click()
    await expect.poll(async () => (await readStyle(page))?.backgroundColor).toBe('#ef4444')
    // WYSIWYG — the colour also paints onto the canvas field's background rect.
    await expect.poll(async () => readBgRectFill(page)).toBe('#ef4444')

    // The in-popover "Transparent" button removes the fill (null) in the store
    // AND on the canvas.
    await page.getByTestId('color-picker-transparent').click()
    await expect.poll(async () => (await readStyle(page))?.backgroundColor).toBeNull()
    await expect.poll(async () => readBgRectFill(page)).toBe('transparent')
  })

  test('floating toolbar re-anchors when the canvas zoom changes', async ({ page }) => {
    await bootstrap(page)
    const toolbar = page.getByTestId('floating-selection-toolbar')
    await expect(toolbar).toBeVisible()

    const before = await toolbar.boundingBox()
    await page.evaluate(() => window.__uiStore.getState().setZoom(2))
    await page.waitForTimeout(120)
    const after = await toolbar.boundingBox()

    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    // Still visible, and its position tracked the zoomed selection.
    await expect(toolbar).toBeVisible()
    expect(Math.abs((after!.y ?? 0) - (before!.y ?? 0))).toBeGreaterThan(1)
  })
})
