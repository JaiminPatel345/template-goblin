/**
 * E2E regression for GH #23 — "when I close one page it also closes the
 * other one."
 *
 * The store-level matrix in pageCloseMatrix.test.ts already pins the
 * reducer, but the real bug was in the component path: onboarding via
 * image left `backgroundDataUrl` set and `pages = []`, and handleAddPage
 * gave the newly-added page `index = 0`, shadowing the legacy page in
 * PageBar. Only one tab rendered but the user believed there were two;
 * clicking ✕ tripped the "last page" confirm branch and called `reset()`.
 *
 * This spec seeds the exact state (legacy bg + one added page at index 1
 * after the fix) and walks the close flows end-to-end.
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

async function seed(
  page: Page,
  opts: {
    legacyImageDataUrl: string | null
    pages: PageDef[]
    pageBackgroundDataUrls: Array<[string, string]>
  },
): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'page-close-cascade-test',
        version: '0.0.0',
        width: 600,
        height: 500,
        locked: false,
      },
      fields: [],
      fonts: [],
      groups: [],
      pages: opts.pages,
      backgroundDataUrl: opts.legacyImageDataUrl,
      backgroundBuffer: null,
      pageBackgroundDataUrls: opts.pageBackgroundDataUrls,
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
    localStorage.removeItem('template-goblin-ui')
  }, JSON.stringify(payload))
}

async function readPersistBlob(
  page: Page,
): Promise<{ pages?: PageDef[]; backgroundDataUrl?: string | null } | null> {
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
      state?: { pages?: PageDef[]; backgroundDataUrl?: string | null }
    }
    return parsed.state ?? null
  })
}

function pageTabs(page: Page) {
  return page.locator('button', { hasText: /^Page \d+$/ })
}

function closeButtonFor(page: Page, label: string) {
  const tab = page.locator('button', { hasText: new RegExp(`^${label}$`) }).first()
  return tab.locator('xpath=following-sibling::button[contains(@class,"tg-btn--danger")]')
}

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=='

test.describe('GH #23 — closing one page never closes another', () => {
  test('legacy image + added image: closing Page 1 keeps Page 2 intact', async ({ page }) => {
    // Under the fix, an added page in a legacy-bg template gets `index: 1`
    // so both appear as tabs. (Before the fix, index was 0 and the legacy
    // tab was shadowed.)
    await seed(page, {
      legacyImageDataUrl: TINY_PNG,
      pages: [
        {
          id: 'added',
          index: 1,
          backgroundType: 'image',
          backgroundColor: null,
          backgroundFilename: 'backgrounds/added.png',
        },
      ],
      pageBackgroundDataUrls: [['added', TINY_PNG]],
    })
    await page.goto('/')
    await expect(pageTabs(page)).toHaveCount(2)

    await closeButtonFor(page, 'Page 1').click()
    await page.waitForTimeout(150)

    // One tab must remain; the app must still show a canvas, not the
    // onboarding picker.
    await expect(pageTabs(page)).toHaveCount(1)
    await expect(page.locator('[data-testid="onboarding-solid-color"]')).toHaveCount(0)

    const blob = await readPersistBlob(page)
    expect(blob?.pages ?? []).toHaveLength(1)
    expect(blob?.pages?.[0]?.index).toBe(0)
    expect(blob?.pages?.[0]?.id).toBe('added')
  })

  test('legacy image + added image: closing Page 2 keeps the legacy background', async ({
    page,
  }) => {
    await seed(page, {
      legacyImageDataUrl: TINY_PNG,
      pages: [
        {
          id: 'added',
          index: 1,
          backgroundType: 'image',
          backgroundColor: null,
          backgroundFilename: 'backgrounds/added.png',
        },
      ],
      pageBackgroundDataUrls: [['added', TINY_PNG]],
    })
    await page.goto('/')
    await expect(pageTabs(page)).toHaveCount(2)

    await closeButtonFor(page, 'Page 2').click()
    await page.waitForTimeout(150)

    await expect(pageTabs(page)).toHaveCount(1)
    await expect(page.locator('[data-testid="onboarding-solid-color"]')).toHaveCount(0)

    const blob = await readPersistBlob(page)
    expect(blob?.pages ?? []).toHaveLength(0)
    expect(blob?.backgroundDataUrl).toBeTruthy()
  })

  test('two explicit pages (colour + image): closing Page 1 keeps Page 2 rendered', async ({
    page,
  }) => {
    await seed(page, {
      legacyImageDataUrl: null,
      pages: [
        {
          id: 'p-color',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#abcdef',
          backgroundFilename: null,
        },
        {
          id: 'p-image',
          index: 1,
          backgroundType: 'image',
          backgroundColor: null,
          backgroundFilename: 'backgrounds/p-image.png',
        },
      ],
      pageBackgroundDataUrls: [['p-image', TINY_PNG]],
    })
    await page.goto('/')
    await expect(pageTabs(page)).toHaveCount(2)

    await closeButtonFor(page, 'Page 1').click()
    await page.waitForTimeout(150)

    await expect(pageTabs(page)).toHaveCount(1)
    await expect(page.locator('[data-testid="onboarding-solid-color"]')).toHaveCount(0)

    const blob = await readPersistBlob(page)
    expect(blob?.pages ?? []).toHaveLength(1)
    expect(blob?.pages?.[0]?.id).toBe('p-image')
    expect(blob?.pages?.[0]?.index).toBe(0)
  })

  test('two explicit pages (image + image): closing Page 1 keeps Page 2 rendered', async ({
    page,
  }) => {
    await seed(page, {
      legacyImageDataUrl: null,
      pages: [
        {
          id: 'p-img-1',
          index: 0,
          backgroundType: 'image',
          backgroundColor: null,
          backgroundFilename: 'backgrounds/p-img-1.png',
        },
        {
          id: 'p-img-2',
          index: 1,
          backgroundType: 'image',
          backgroundColor: null,
          backgroundFilename: 'backgrounds/p-img-2.png',
        },
      ],
      pageBackgroundDataUrls: [
        ['p-img-1', TINY_PNG],
        ['p-img-2', TINY_PNG],
      ],
    })
    await page.goto('/')
    await expect(pageTabs(page)).toHaveCount(2)

    await closeButtonFor(page, 'Page 1').click()
    await page.waitForTimeout(150)

    await expect(pageTabs(page)).toHaveCount(1)
    await expect(page.locator('[data-testid="onboarding-solid-color"]')).toHaveCount(0)

    const blob = await readPersistBlob(page)
    expect(blob?.pages ?? []).toHaveLength(1)
    expect(blob?.pages?.[0]?.id).toBe('p-img-2')
    expect(blob?.pages?.[0]?.index).toBe(0)
  })
})
