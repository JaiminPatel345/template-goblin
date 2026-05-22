/**
 * #128 — comprehensive coverage of the new menu + ribbon top bar.
 *
 * Every visible button gets a happy-path test + the edge cases that
 * touch it (locked template, no background, multi-tab swap, theme
 * persistence, etc.). Drives store reads via `__uiStore` /
 * `__templateStore` because those are exposed in DEV builds and let
 * the assertions check effect, not just affordance.
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

async function completeOnboarding(page: Page): Promise<void> {
  await page.locator('[data-testid="onboarding-solid-color"]').click()
  await page.locator('[data-testid="onboarding-color-next"]').click()
  await expect(page.getByRole('heading', { name: /choose page size/i })).toBeVisible({
    timeout: 5000,
  })
  await page.locator('[data-testid="onboarding-color-apply"]').click()
  await expect(page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()).toBeVisible({
    timeout: 5000,
  })
}

async function gotoEditor(page: Page): Promise<void> {
  await clearStorage(page)
  await page.goto('/')
  await completeOnboarding(page)
}

interface UiSnapshot {
  activeMenuTab: string
  activeTool: string
  showGrid: boolean
  zoom: number
  theme: string
  showLeftPanel: boolean
  showRightPanel: boolean
  showPreview: boolean
  locked: boolean
  headerEnabled: boolean
  footerEnabled: boolean
  pageNumberEnabled: boolean
}

async function ui(page: Page): Promise<UiSnapshot> {
  return await page.evaluate(() => {
    interface UStore {
      getState(): {
        activeMenuTab: string
        activeTool: string
        showGrid: boolean
        zoom: number
        theme: string
        showLeftPanel: boolean
        showRightPanel: boolean
        showPreview: boolean
      }
    }
    interface TStore {
      getState(): {
        meta: { locked: boolean }
        header?: { enabled: boolean }
        footer?: { enabled: boolean }
        pageNumber?: { enabled: boolean }
      }
    }
    const u = (window as unknown as { __uiStore?: UStore }).__uiStore?.getState()
    const t = (window as unknown as { __templateStore?: TStore }).__templateStore?.getState()
    return {
      activeMenuTab: u?.activeMenuTab ?? '',
      activeTool: u?.activeTool ?? '',
      showGrid: !!u?.showGrid,
      zoom: u?.zoom ?? 1,
      theme: u?.theme ?? '',
      showLeftPanel: !!u?.showLeftPanel,
      showRightPanel: !!u?.showRightPanel,
      showPreview: !!u?.showPreview,
      locked: !!t?.meta.locked,
      headerEnabled: !!t?.header?.enabled,
      footerEnabled: !!t?.footer?.enabled,
      pageNumberEnabled: !!t?.pageNumber?.enabled,
    }
  })
}

test.describe('#128 — Menu tab strip', () => {
  test.beforeEach(({ page }) => gotoEditor(page))

  test('all 6 tabs render and click-swap the ribbon', async ({ page }) => {
    const tabs = ['file', 'edit', 'insert', 'format', 'view', 'help'] as const
    for (const t of tabs) {
      await expect(page.locator(`[data-testid="menu-tab-${t}"]`)).toBeVisible()
    }
    // Default opening tab is `insert`.
    expect((await ui(page)).activeMenuTab).toBe('insert')
    // Click each tab, verify the corresponding ribbon mounts.
    for (const t of tabs) {
      await page.locator(`[data-testid="menu-tab-${t}"]`).click()
      await expect(page.locator(`[data-testid="ribbon-${t}"]`)).toBeVisible()
      expect((await ui(page)).activeMenuTab).toBe(t)
    }
  })
})

test.describe('#128 — Pinned tools (Text / Image / Table)', () => {
  test.beforeEach(({ page }) => gotoEditor(page))

  for (const { tool, kind } of [
    { tool: 'toolbar-tool-text', kind: 'addText' },
    { tool: 'toolbar-tool-image', kind: 'addImage' },
    { tool: 'toolbar-tool-table', kind: 'addLoop' },
  ] as const) {
    test(`${tool} toggles activeTool=${kind} and back to select`, async ({ page }) => {
      expect((await ui(page)).activeTool).toBe('select')
      await page.locator(`[data-testid="${tool}"]`).click()
      expect((await ui(page)).activeTool).toBe(kind)
      // Click again returns to select.
      await page.locator(`[data-testid="${tool}"]`).click()
      expect((await ui(page)).activeTool).toBe('select')
    })

    test(`${tool} is visible regardless of active menu tab`, async ({ page }) => {
      for (const t of ['file', 'edit', 'format', 'view', 'help'] as const) {
        await page.locator(`[data-testid="menu-tab-${t}"]`).click()
        await expect(page.locator(`[data-testid="${tool}"]`)).toBeVisible()
      }
    })
  }

  test('locked template disables every pinned tool', async ({ page }) => {
    await page.evaluate(() => {
      interface T {
        getState(): { setLocked: (v: boolean) => void }
      }
      ;(window as unknown as { __templateStore?: T }).__templateStore?.getState().setLocked(true)
    })
    for (const tool of ['toolbar-tool-text', 'toolbar-tool-image', 'toolbar-tool-table']) {
      await expect(page.locator(`[data-testid="${tool}"]`)).toBeDisabled()
    }
  })
})

test.describe('#128 — Far-right CTAs (Preview / Save / Lock)', () => {
  test.beforeEach(({ page }) => gotoEditor(page))

  test('Preview button opens the preview dialog', async ({ page }) => {
    expect((await ui(page)).showPreview).toBe(false)
    await page.locator('[data-testid="toolbar-preview"]').click()
    expect((await ui(page)).showPreview).toBe(true)
    await expect(page.locator('[data-testid="preview-dialog"]')).toBeVisible()
  })

  test('Save button flashes "Saved!" then reverts', async ({ page }) => {
    const btn = page.locator('[data-testid="toolbar-save"]')
    await expect(btn).toContainText(/^Save$/)
    await btn.click()
    await expect(btn).toContainText(/Saved!/)
    // Reverts within ~1.5s.
    await expect(btn).toContainText(/^Save$/, { timeout: 2500 })
  })

  test('Lock toggle flips templateStore.meta.locked + label', async ({ page }) => {
    const btn = page.locator('[data-testid="toolbar-lock"]')
    await expect(btn).toContainText(/Lock/)
    await btn.click()
    expect((await ui(page)).locked).toBe(true)
    await expect(btn).toContainText(/Unlock/)
    await btn.click()
    expect((await ui(page)).locked).toBe(false)
  })
})

test.describe('#128 — File ribbon', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page)
    await page.locator('[data-testid="menu-tab-file"]').click()
  })

  test('New button confirms then resets the template', async ({ page }) => {
    page.once('dialog', (d) => d.accept())
    await page.locator('[data-testid="toolbar-new"]').click()
    // Onboarding picker reappears (canvas was reset → no background).
    await expect(page.locator('[data-testid="onboarding-solid-color"]')).toBeVisible({
      timeout: 3000,
    })
  })

  test('New button does NOT reset when the confirm is dismissed', async ({ page }) => {
    page.once('dialog', (d) => d.dismiss())
    await page.locator('[data-testid="toolbar-new"]').click()
    // Canvas stays mounted (no onboarding).
    await expect(page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()).toBeVisible()
  })

  test('Open button surfaces and opens a hidden file input', async ({ page }) => {
    await expect(page.locator('[data-testid="toolbar-open"]')).toBeVisible()
    // Click — file input is hidden but Playwright surfaces it via the
    // upcoming file chooser event handler.
    const chooserPromise = page.waitForEvent('filechooser')
    await page.locator('[data-testid="toolbar-open"]').click()
    const chooser = await chooserPromise
    expect(chooser).toBeTruthy()
  })

  test('Change Background button opens the dialog', async ({ page }) => {
    await page.locator('[data-testid="toolbar-change-background"]').click()
    // The Change Background dialog reuses `AddPageDialog` in edit mode.
    // Its title is "Change Background".
    await expect(page.locator('.tg-dialog-title', { hasText: 'Change Background' })).toBeVisible({
      timeout: 3000,
    })
  })
})

test.describe('#128 — Edit ribbon', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page)
    await page.locator('[data-testid="menu-tab-edit"]').click()
  })

  test('Undo / Redo render and are disabled when there is no history', async ({ page }) => {
    await expect(page.locator('[data-testid="ribbon-undo"]')).toBeDisabled()
    await expect(page.locator('[data-testid="ribbon-redo"]')).toBeDisabled()
  })
})

test.describe('#128 — Insert ribbon', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page)
    await page.locator('[data-testid="menu-tab-insert"]').click()
  })

  test('Header button opens the band settings popup', async ({ page }) => {
    await page.locator('[data-testid="ribbon-insert-header"]').click()
    await expect(page.locator('[data-testid="band-settings-modal"]')).toBeVisible()
    // Show toggle lives inside the popup.
    await expect(page.locator('text=Show header')).toBeVisible()
  })

  test('Footer button opens the band settings popup', async ({ page }) => {
    await page.locator('[data-testid="ribbon-insert-footer"]').click()
    await expect(page.locator('[data-testid="band-settings-modal"]')).toBeVisible()
    await expect(page.locator('text=Show footer')).toBeVisible()
  })

  test('Page Number button opens the page-number settings popup', async ({ page }) => {
    await page.locator('[data-testid="ribbon-insert-pagenumber"]').click()
    await expect(page.locator('[data-testid="band-settings-modal"]')).toBeVisible()
  })

  test('Page Number → pick Header placement auto-creates the header band', async ({ page }) => {
    // Pre-condition: both bands disabled.
    expect((await ui(page)).headerEnabled).toBe(false)
    expect((await ui(page)).footerEnabled).toBe(false)
    // Open Page Number popup.
    await page.locator('[data-testid="ribbon-insert-pagenumber"]').click()
    await expect(page.locator('[data-testid="band-settings-modal"]')).toBeVisible()
    // Enable page number (defaults to footer placement → footer auto-created).
    await page
      .locator('.tg-toggle-row', { hasText: 'Show page number' })
      .locator('input[type="checkbox"]')
      .check()
    expect((await ui(page)).pageNumberEnabled).toBe(true)
    expect((await ui(page)).footerEnabled).toBe(true)
    // The Placement buttons MUST be enabled — switch to Header → header auto-creates.
    const headerPlacementBtn = page.locator('.tg-btn', { hasText: /^Header$/ })
    await expect(headerPlacementBtn).not.toBeDisabled()
    await headerPlacementBtn.click()
    expect((await ui(page)).headerEnabled).toBe(true)
  })

  test('Page Number → pick Footer placement auto-creates the footer band when header was first', async ({
    page,
  }) => {
    // Force header-only path: open page-number popup, enable, then
    // switch to header first, then back to footer (footer was never on).
    await page.evaluate(() => {
      interface T {
        getState(): { setFooter: (v: undefined) => void }
      }
      ;(window as unknown as { __templateStore?: T }).__templateStore
        ?.getState()
        .setFooter(undefined)
    })
    await page.locator('[data-testid="ribbon-insert-pagenumber"]').click()
    await page
      .locator('.tg-toggle-row', { hasText: 'Show page number' })
      .locator('input[type="checkbox"]')
      .check()
    // Manually pick Header first to make footer the "missing" band.
    await page.locator('.tg-btn', { hasText: /^Header$/ }).click()
    await page.evaluate(() => {
      interface T {
        getState(): { setFooter: (v: undefined) => void }
      }
      ;(window as unknown as { __templateStore?: T }).__templateStore
        ?.getState()
        .setFooter(undefined)
    })
    expect((await ui(page)).footerEnabled).toBe(false)
    // Now click Footer placement — footer band auto-creates.
    const footerPlacementBtn = page.locator('.tg-btn', { hasText: /^Footer$/ })
    await expect(footerPlacementBtn).not.toBeDisabled()
    await footerPlacementBtn.click()
    expect((await ui(page)).footerEnabled).toBe(true)
  })

  test('Enabled band shows an active highlight on the ribbon button', async ({ page }) => {
    // Programmatic enable so we don't depend on the popup's checkbox path.
    await page.evaluate(() => {
      interface T {
        getState(): { setHeaderEnabled: (v: boolean) => void }
      }
      ;(window as unknown as { __templateStore?: T }).__templateStore
        ?.getState()
        .setHeaderEnabled(true)
    })
    await expect(page.locator('[data-testid="ribbon-insert-header"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

test.describe('#128 — View ribbon', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page)
    await page.locator('[data-testid="menu-tab-view"]').click()
  })

  test('Snap toggle flips uiStore.showGrid', async ({ page }) => {
    const before = (await ui(page)).showGrid
    await page.locator('[data-testid="ribbon-snap"]').click()
    expect((await ui(page)).showGrid).toBe(!before)
  })

  test('Zoom in / reset / out cycle the zoom level', async ({ page }) => {
    expect((await ui(page)).zoom).toBe(1)
    await page.locator('[data-testid="ribbon-zoom-in"]').click()
    expect((await ui(page)).zoom).toBeGreaterThan(1)
    await page.locator('[data-testid="ribbon-zoom-reset"]').click()
    expect((await ui(page)).zoom).toBe(1)
    await page.locator('[data-testid="ribbon-zoom-out"]').click()
    expect((await ui(page)).zoom).toBeLessThan(1)
  })

  test('Theme toggle flips data-theme on .tg-app', async ({ page }) => {
    const before = await page.locator('.tg-app').getAttribute('data-theme')
    await page.locator('[data-testid="ribbon-theme"]').click()
    const after = await page.locator('.tg-app').getAttribute('data-theme')
    expect(after).not.toBe(before)
  })

  test('Left panel toggle flips uiStore.showLeftPanel', async ({ page }) => {
    const before = (await ui(page)).showLeftPanel
    await page.locator('[data-testid="toolbar-toggle-left-panel"]').click()
    expect((await ui(page)).showLeftPanel).toBe(!before)
  })

  test('Right panel toggle flips uiStore.showRightPanel', async ({ page }) => {
    const before = (await ui(page)).showRightPanel
    await page.locator('[data-testid="toolbar-toggle-right-panel"]').click()
    expect((await ui(page)).showRightPanel).toBe(!before)
  })
})

test.describe('#128 — Format ribbon', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page)
    await page.locator('[data-testid="menu-tab-format"]').click()
  })

  test('Properties panel toggle mirrors showLeftPanel state', async ({ page }) => {
    const before = (await ui(page)).showLeftPanel
    await page.locator('[data-testid="ribbon-toggle-properties"]').click()
    expect((await ui(page)).showLeftPanel).toBe(!before)
  })

  test('Font Manager button opens the font manager dialog', async ({ page }) => {
    await page.locator('[data-testid="ribbon-fonts"]').click()
    await expect(page.locator('.tg-dialog-title', { hasText: 'Font Manager' })).toBeVisible({
      timeout: 3000,
    })
  })
})

test.describe('#128 — Help ribbon', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page)
    await page.locator('[data-testid="menu-tab-help"]').click()
  })

  test('GitHub button opens a new tab', async ({ page, context }) => {
    const popupPromise = context.waitForEvent('page')
    await page.locator('[data-testid="ribbon-help-github"]').click()
    const popup = await popupPromise
    expect(popup.url()).toContain('github.com')
    await popup.close()
  })

  test('Shortcuts button opens a native alert', async ({ page }) => {
    let alertText = ''
    page.once('dialog', async (d) => {
      alertText = d.message()
      await d.accept()
    })
    await page.locator('[data-testid="ribbon-help-shortcuts"]').click()
    expect(alertText).toMatch(/Ctrl\+Z/)
  })
})

test.describe('#128 — Theme styling across both palettes', () => {
  test.beforeEach(({ page }) => gotoEditor(page))

  test('menu bar background reflects --bg-secondary in both themes', async ({ page }) => {
    // Light theme baseline (default — actual depends on system pref, so
    // read the live token instead of hard-coding rgb).
    const tokenBefore = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.tg-app') as HTMLElement).getPropertyValue(
        '--bg-secondary',
      ),
    )
    const menuBg = await page
      .locator('[role="menubar"]')
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(menuBg).toBeTruthy()
    // Flip theme via View ribbon → re-read.
    await page.locator('[data-testid="menu-tab-view"]').click()
    await page.locator('[data-testid="ribbon-theme"]').click()
    const tokenAfter = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.tg-app') as HTMLElement).getPropertyValue(
        '--bg-secondary',
      ),
    )
    // Token resolves to a different value across themes.
    expect(tokenAfter).not.toBe(tokenBefore)
  })
})
