import { test, expect } from '@playwright/test'

test.describe('New Direct Onboarding & Change Background Rules', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
    })
    await page.goto('/')
  })

  test('default editor load lands directly on canvas with white A4 page', async ({ page }) => {
    // 1. Onboarding wizard modal should NOT exist
    await expect(page.locator('[data-testid="onboarding-solid-color"]')).toHaveCount(0)

    // 2. Canvas stage wrapper is visible immediately
    await expect(page.locator('[data-testid="canvas-stage-wrapper"]')).toBeVisible()

    // 3. Verify page 0 store defaults (white solid color on A4)
    const page0 = await page.evaluate(() => {
      const store = (
        window as unknown as {
          __templateStore?: {
            getState: () => {
              pages: Array<{
                pageSize: string
                backgroundColor: string
                width: number
                height: number
              }>
            }
          }
        }
      ).__templateStore
      return store?.getState().pages[0]
    })

    expect(page0).toBeDefined()
    expect(page0?.pageSize).toBe('A4')
    expect(page0?.backgroundColor).toBe('#ffffff')
    expect(page0?.width).toBe(595)
    expect(page0?.height).toBe(842)
  })

  test('Navbar defaults to File tab with New, Open, and Change Background visible', async ({
    page,
  }) => {
    // 1. File tab is selected by default
    const fileTab = page.locator('[data-testid="menu-tab-file"]')
    await expect(fileTab).toHaveAttribute('data-active', 'true')

    // 2. File ribbon buttons are visible immediately
    await expect(page.locator('[data-testid="toolbar-new"]')).toBeVisible()
    await expect(page.locator('[data-testid="toolbar-open"]')).toBeVisible()
    await expect(page.locator('[data-testid="toolbar-change-background"]')).toBeVisible()
  })

  test('clicking canvas de-highlights navbar tab and hides ribbon sub-options', async ({
    page,
  }) => {
    const fileTab = page.locator('[data-testid="menu-tab-file"]')
    const ribbon = page.locator('[data-testid="ribbon-file"]')

    // Initially File tab is highlighted and ribbon is visible
    await expect(fileTab).toHaveAttribute('data-active', 'true')
    await expect(ribbon).toBeVisible()

    // Click outside on canvas area
    await page.locator('[data-testid="canvas-stage-wrapper"]').click()

    // Ribbon is hidden and File tab is de-highlighted
    await expect(ribbon).toHaveCount(0)
    await expect(fileTab).not.toHaveAttribute('data-active', 'true')

    // Clicking File tab re-expands ribbon and re-highlights File tab
    await fileTab.click()
    await expect(ribbon).toBeVisible()
    await expect(fileTab).toHaveAttribute('data-active', 'true')
  })

  test('Change Background on Page 1 does NOT show "Same as previous"', async ({ page }) => {
    // Open Change Background on Page 1
    await page.locator('[data-testid="toolbar-change-background"]').click()

    // Verify dialog opens
    await expect(page.locator('.tg-dialog')).toBeVisible()
    await expect(page.locator('.tg-dialog-title')).toHaveText('Change Background')

    // "Same as previous page" button must NOT exist on 1st page
    await expect(page.locator('[data-testid="add-page-inherit"]')).toHaveCount(0)
  })

  test('Change Background on Page 2+ DOES show "Same as previous"', async ({ page }) => {
    // Switch to Insert tab and add Page 2
    await page.locator('[data-testid="menu-tab-insert"]').click()
    await page.locator('[data-testid="page-bar-add"]').click()
    await page.locator('[data-testid="add-page-confirm"]').click()

    // Now on Page 2 — open Change Background
    await page.locator('[data-testid="menu-tab-file"]').click()
    await page.locator('[data-testid="toolbar-change-background"]').click()

    // "Same as previous page" button MUST exist on 2nd+ page
    await expect(page.locator('[data-testid="add-page-inherit"]')).toBeVisible()
  })

  test('Changing wallpaper on Page 2 updates ONLY Page 2 background, leaving Page 1 untouched', async ({
    page,
  }) => {
    // 1. Add Page 2
    await page.locator('[data-testid="menu-tab-insert"]').click()
    await page.locator('[data-testid="page-bar-add"]').click()
    await page.locator('[data-testid="add-page-confirm"]').click()

    // 2. Change background of Page 2 to color
    await page.locator('[data-testid="menu-tab-file"]').click()
    await page.locator('[data-testid="toolbar-change-background"]').click()
    await page.locator('button:has-text("Solid color")').click()
    await page.locator('[data-testid="onboarding-color-hex"]').fill('#ff0000')
    await page.locator('button:has-text("Next →")').click()
    await page.locator('[data-testid="add-page-confirm"]').click()

    // 3. Verify store state: Page 1 is white (#ffffff), Page 2 is red (#ff0000)
    const pages = await page.evaluate(() => {
      const store = (
        window as unknown as {
          __templateStore?: {
            getState: () => { pages: Array<{ index: number; backgroundColor: string }> }
          }
        }
      ).__templateStore
      return store?.getState().pages
    })

    expect(pages).toHaveLength(2)
    const p1 = pages?.find((p) => p.index === 0)
    const p2 = pages?.find((p) => p.index === 1)
    expect(p1?.backgroundColor).toBe('#ffffff')
    expect(p2?.backgroundColor).toBe('#ff0000')
  })

  test('Grid overlay is disabled by default in new template', async ({ page }) => {
    const showGrid = await page.evaluate(() => {
      const store = (
        window as unknown as {
          __uiStore?: {
            getState: () => { showGrid: boolean }
          }
        }
      ).__uiStore
      return store?.getState().showGrid
    })
    expect(showGrid).toBe(false)
  })

  test('Change Background wizard shows "Upload image" button label', async ({ page }) => {
    await page.locator('[data-testid="toolbar-change-background"]').click()
    await expect(page.locator('button:has-text("Upload image")')).toBeVisible()
    await expect(page.locator('button:has-text("Upload new image")')).toHaveCount(0)
  })

  test('clicking active tab toggles activeMenuTab to null and back', async ({ page }) => {
    const fileTab = page.locator('[data-testid="menu-tab-file"]')
    const ribbon = page.locator('[data-testid="ribbon-file"]')

    // Initially active
    await expect(fileTab).toHaveAttribute('data-active', 'true')
    await expect(ribbon).toBeVisible()

    // Click active File tab -> collapses ribbon and de-highlights tab
    await fileTab.click()
    await expect(fileTab).not.toHaveAttribute('data-active', 'true')
    await expect(ribbon).toHaveCount(0)

    // Click File tab again -> expands ribbon and re-highlights tab
    await fileTab.click()
    await expect(fileTab).toHaveAttribute('data-active', 'true')
    await expect(ribbon).toBeVisible()
  })
})
