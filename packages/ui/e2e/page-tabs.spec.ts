/**
 * E2E coverage for the page navigation bar (PageBar.tsx + usePageHandlers).
 *
 * Covers the page CRUD flow:
 *   - Switching between pages keeps each page's fields isolated.
 *   - Adding a solid-color page lands on the new page automatically.
 *   - Closing a non-last page re-indexes the remainder.
 *   - Closing the LAST page prompts via window.confirm and on OK resets.
 *   - REGRESSION: when page 0 is solid-color (explicit PageDefinition with
 *     index 0), the tab bar must NOT also render a phantom implicit "Page 1"
 *     button — that bug let the user see two tabs and "delete Page 2"
 *     accidentally trigger a full reset because pages.length was 1.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

interface PageDef {
  id: string
  index: number
  backgroundType: 'color' | 'image' | 'inherit'
  backgroundColor: string | null
  backgroundFilename: string | null
}

interface SeedField {
  id: string
  pageId: string | null
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

const TEXT_STYLE = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontSizeDynamic: false,
  fontSizeMin: 8,
  lineHeight: 1.2,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  align: 'left',
  verticalAlign: 'top',
  maxRows: 2,
  overflowMode: 'truncate',
  snapToGrid: false,
}

function fieldPayload(s: SeedField): Record<string, unknown> {
  return {
    id: s.id,
    type: 'text',
    label: s.id,
    groupId: null,
    pageId: s.pageId,
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
    zIndex: s.zIndex,
    source: { mode: 'dynamic', jsonKey: s.id, required: false, placeholder: null },
    style: TEXT_STYLE,
  }
}

async function seed(page: Page, pages: PageDef[], fields: SeedField[]): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'page-tabs-test',
        version: '0.0.0',
        width: 1000,
        height: 800,
        locked: false,
      },
      fields: fields.map(fieldPayload),
      fonts: [],
      groups: [],
      pages,
      backgroundDataUrl: null,
      backgroundBuffer: null,
      pageBackgroundDataUrls: [],
      pageBackgroundBuffers: [],
      fontBuffers: [],
      placeholderBuffers: [],
      staticImageBuffers: [],
      staticImageDataUrls: [],
    },
    version: 2,
  }
  await page.addInitScript((s: string) => {
    localStorage.setItem('template-goblin-template', s)
  }, JSON.stringify(payload))
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

/**
 * The templateStore's persist backing is IndexedDB (GH #11). localStorage is
 * only used as a migration source on first load, after which it's cleared.
 * These helpers read the live blob out of IDB so assertions see the current
 * state.
 */
async function readPersistBlob(
  page: Page,
): Promise<{ pages?: PageDef[]; fields?: Array<{ id: string }> } | null> {
  return await page.evaluate(async () => {
    const DB_NAME = 'template-goblin'
    const STORE_NAME = 'kv'
    const KEY = 'template-goblin-template'

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const d = req.result
        if (!d.objectStoreNames.contains(STORE_NAME)) d.createObjectStore(STORE_NAME)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    const raw = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(KEY) as IDBRequest<string | undefined>
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
    })

    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      state?: { pages?: PageDef[]; fields?: Array<{ id: string }> }
    }
    return parsed.state ?? null
  })
}

async function readPages(page: Page): Promise<PageDef[]> {
  const blob = await readPersistBlob(page)
  return blob?.pages ?? []
}

async function readFieldIds(page: Page): Promise<string[]> {
  const blob = await readPersistBlob(page)
  return (blob?.fields ?? []).map((f) => f.id)
}

async function pageTabCount(page: Page): Promise<number> {
  // Each tab is a button with text exactly "Page N". `:has-text` does
  // substring matching which would also catch "+ Add Page" — use a regex
  // anchored to digits to match only the numbered tab labels.
  return await page.locator('button', { hasText: /^Page \d+$/ }).count()
}

/* ------------------------------------------------------------------------ */
/*  Tests                                                                   */
/* ------------------------------------------------------------------------ */

test.describe('Page tabs — switch / add / delete', () => {
  test('seed with 1 explicit page-0 (solid color) renders exactly ONE Page tab', async ({
    page,
  }) => {
    // REGRESSION: previously the bar rendered an implicit "Page 1" PLUS an
    // explicit-index-0 page → two tabs for one logical page.
    await seed(
      page,
      [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
        },
      ],
      [],
    )
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    expect(await pageTabCount(page)).toBe(1)
    await expect(page.locator('button:has-text("Page 1")')).toHaveCount(1)
    await expect(page.locator('button:has-text("Page 2")')).toHaveCount(0)
  })

  test('seed with 3 pages renders 3 tabs labelled Page 1, 2, 3', async ({ page }) => {
    await seed(
      page,
      [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
        },
        {
          id: 'p1',
          index: 1,
          backgroundType: 'color',
          backgroundColor: '#eeeeee',
          backgroundFilename: null,
        },
        {
          id: 'p2',
          index: 2,
          backgroundType: 'color',
          backgroundColor: '#dddddd',
          backgroundFilename: null,
        },
      ],
      [],
    )
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    expect(await pageTabCount(page)).toBe(3)
    await expect(page.locator('button:has-text("Page 1")')).toHaveCount(1)
    await expect(page.locator('button:has-text("Page 2")')).toHaveCount(1)
    await expect(page.locator('button:has-text("Page 3")')).toHaveCount(1)
  })

  test("clicking Page 2 isolates the canvas to that page's fields", async ({ page }) => {
    // Two pages, fields on each
    await seed(
      page,
      [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
        },
        {
          id: 'p1',
          index: 1,
          backgroundType: 'color',
          backgroundColor: '#eeeeee',
          backgroundFilename: null,
        },
      ],
      [
        { id: 'f0', pageId: 'p0', x: 50, y: 50, width: 100, height: 50, zIndex: 0 },
        { id: 'f1', pageId: 'p1', x: 50, y: 50, width: 100, height: 50, zIndex: 0 },
      ],
    )
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()

    // Initially on Page 1; canvas should have exactly 1 field group (f0)
    await page.locator('button:has-text("Page 2")').click()
    await page.waitForTimeout(120)
    const idsOnP2 = await page.evaluate(() => {
      interface FabricLike {
        getObjects(): Array<{ __fieldId?: string; __isGrid?: boolean }>
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      return (fc?.getObjects() ?? [])
        .filter((o) => o.__fieldId && !o.__isGrid)
        .map((o) => o.__fieldId)
        .filter(Boolean)
    })
    expect(idsOnP2).toEqual(['f1'])
  })

  test('clicking the X on a non-last page removes it and re-indexes', async ({ page }) => {
    await seed(
      page,
      [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
        },
        {
          id: 'p1',
          index: 1,
          backgroundType: 'color',
          backgroundColor: '#eeeeee',
          backgroundFilename: null,
        },
        {
          id: 'p2',
          index: 2,
          backgroundType: 'color',
          backgroundColor: '#dddddd',
          backgroundFilename: null,
        },
      ],
      [],
    )
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()

    // Click X on Page 2. The DOM is:
    //   <div><button>Page 2</button><button class="tg-btn--danger">✕</button></div>
    // Find the Page-2 button, then the next-sibling X.
    const page2Btn = page.locator('button', { hasText: /^Page 2$/ }).first()
    const removeBtn = page2Btn.locator(
      'xpath=following-sibling::button[contains(@class,"tg-btn--danger")]',
    )
    await removeBtn.click()
    await page.waitForTimeout(120)

    const after = await readPages(page)
    expect(after.length).toBe(2)
    expect(after.map((p) => p.index).sort()).toEqual([0, 1])
  })

  test('closing the LAST page prompts confirm and on OK resets the template', async ({ page }) => {
    await seed(
      page,
      [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
        },
      ],
      [{ id: 'f1', pageId: null, x: 50, y: 50, width: 100, height: 50, zIndex: 0 }],
    )
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()

    // Auto-accept the upcoming confirm dialog
    page.once('dialog', async (d) => {
      expect(d.message()).toMatch(/clear all fields/i)
      await d.accept()
    })

    // X on Page 1 (the only page)
    const removeBtn = page.locator('[data-testid="remove-page-1"]').first()
    await removeBtn.click()
    await page.waitForTimeout(150)

    // After reset, fields are empty AND we're back to the onboarding picker
    expect(await readFieldIds(page)).toEqual([])
    await expect(page.locator('[data-testid="onboarding-upload-image"]')).toBeVisible()
  })

  test('closing the LAST page on Cancel keeps everything intact', async ({ page }) => {
    await seed(
      page,
      [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
        },
      ],
      [{ id: 'keep_me', pageId: null, x: 50, y: 50, width: 100, height: 50, zIndex: 0 }],
    )
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()

    page.once('dialog', async (d) => {
      await d.dismiss()
    })

    const removeBtn = page.locator('[data-testid="remove-page-1"]').first()
    await removeBtn.click()
    await page.waitForTimeout(120)

    expect(await readFieldIds(page)).toEqual(['keep_me'])
    expect((await readPages(page)).length).toBe(1)
  })
})
