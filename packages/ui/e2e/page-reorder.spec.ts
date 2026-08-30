import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

interface PageDef {
  id: string
  index: number
  backgroundType: 'color' | 'image'
  backgroundColor: string | null
  backgroundFilename: string | null
}

async function seedThreePages(page: Page): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'page-reorder-test',
        version: '0.0.0',
        width: 1000,
        height: 800,
        locked: false,
      },
      fields: [
        {
          id: 'field-p2',
          type: 'text',
          label: 'Field on P2',
          groupId: null,
          pageId: 'p2',
          x: 50,
          y: 50,
          width: 100,
          height: 30,
          zIndex: 0,
          source: { mode: 'static', value: 'Page 3 Field' },
          style: {
            fontId: null,
            fontFamily: 'Helvetica',
            fontSize: 12,
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
          },
        },
      ],
      fonts: [],
      groups: [],
      pages: [
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
          backgroundColor: '#ff0000',
          backgroundFilename: null,
        },
        {
          id: 'p2',
          index: 2,
          backgroundType: 'color',
          backgroundColor: '#00ff00',
          backgroundFilename: null,
        },
      ],
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

async function readPersistPages(page: Page): Promise<PageDef[]> {
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

    if (!raw) return []
    const parsed = JSON.parse(raw) as { state?: { pages?: PageDef[] } }
    return parsed.state?.pages ?? []
  })
}

test.describe('Page bar drag-and-drop reordering (issue #59)', () => {
  test('drags Page 3 to Page 1 slot and verifies store indices update', async ({ page }) => {
    await seedThreePages(page)
    await page.goto('/')

    const tab0Wrapper = page.locator('[data-testid="page-tab-wrapper-0"]')
    const tab2Wrapper = page.locator('[data-testid="page-tab-wrapper-2"]')

    await expect(tab0Wrapper).toBeVisible()
    await expect(tab2Wrapper).toBeVisible()

    // Drag tab 2 (Page 3) onto tab 0 (Page 1)
    await tab2Wrapper.dragTo(tab0Wrapper)

    // Wait for IDB persistence to update
    await page.waitForTimeout(500)

    // Read pages from store IDB
    const pages = await readPersistPages(page)
    const sorted = [...pages].sort((a, b) => a.index - b.index)

    expect(sorted).toHaveLength(3)
    expect(sorted[0]?.id).toBe('p2')
    expect(sorted[0]?.index).toBe(0)
    expect(sorted[1]?.id).toBe('p0')
    expect(sorted[1]?.index).toBe(1)
    expect(sorted[2]?.id).toBe('p1')
    expect(sorted[2]?.index).toBe(2)
  })

  test('drags a non-active page tab and verifies currently-active page remains active', async ({
    page,
  }) => {
    await seedThreePages(page)
    await page.goto('/')

    // Click tab 1 (Page 2) to make it active
    const tab1Btn = page.locator('[data-testid="page-tab-1"]')
    await tab1Btn.click()

    // Assert tab 1 has active class
    await expect(tab1Btn).toHaveClass(/tg-btn--active/)

    // Drag tab 2 (Page 3) to tab 0 (Page 1)
    const tab0Wrapper = page.locator('[data-testid="page-tab-wrapper-0"]')
    const tab2Wrapper = page.locator('[data-testid="page-tab-wrapper-2"]')
    await tab2Wrapper.dragTo(tab0Wrapper)

    // Wait for update
    await page.waitForTimeout(500)

    // The active page ('p1') is now rendered at tab index 2, but its tab button should still be active
    const activeTabBtn = page.locator('button.tg-btn--active')
    await expect(activeTabBtn).toBeVisible()
    await expect(activeTabBtn).toHaveText('Page 3')
  })
})
