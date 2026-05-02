/**
 * E2E for `AddPageDialog` — issue #47 regressions and follow-up UX.
 *
 * Covered:
 *   1. "Same as previous page" → new page added immediately, no size dialog
 *      shown. Stored width/height match the previous page's dimensions.
 *   2. "Solid color" → routes through the size step (the issue's primary
 *      ask: every non-inherit type asks for size).
 *   3. The size picker shows neither "US Letter" nor "US Legal" — the
 *      labels are country-neutral now.
 *   4. Picking "Custom" inside the size picker does NOT grow the dialog
 *      (width or height) — siblings stay anchored.
 *   5. The custom width/height inputs are tab-skipped while a preset is
 *      selected (a11y; their slot exists but is hidden).
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

async function seed(page: Page): Promise<void> {
  // Onboard with a single solid-color page so the toolbar (and "+ Add Page"
  // button) are visible and `previousSize` resolves to a known value.
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'add-page-dialog-test',
        version: '0.0.0',
        width: 595,
        height: 842,
        locked: false,
      },
      fields: [],
      fonts: [],
      groups: [],
      pages: [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
          width: 595,
          height: 842,
          pageSize: 'A4',
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
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('template-goblin', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('kv', 'readwrite')
        tx.objectStore('kv').put(s, 'template-goblin-template')
        tx.oncomplete = () => {
          localStorage.removeItem('template-goblin-ui')
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })
  }, JSON.stringify(payload))
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

async function openAddPage(page: Page): Promise<void> {
  // The "+ Add Page" button is in PageBar; click via its aria/text.
  await page
    .locator('button', { hasText: /\+ Add Page|Add page/i })
    .first()
    .click()
  await expect(page.locator('.tg-dialog-title', { hasText: 'Add New Page' })).toBeVisible()
}

interface PersistedState {
  pages?: Array<{
    id: string
    index: number
    backgroundType: string
    backgroundColor: string | null
    width?: number
    height?: number
  }>
}

async function readPages(page: Page): Promise<PersistedState['pages']> {
  return await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('template-goblin', 1)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const raw = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly')
      const req = tx.objectStore('kv').get('template-goblin-template') as IDBRequest<
        string | undefined
      >
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
    })
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { state?: PersistedState }
    return parsed.state?.pages
  })
}

test.describe('Add Page dialog (#47)', () => {
  test('Same as previous page commits without showing the size step', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openAddPage(page)

    // Click the inherit option. The dialog should close without ever
    // rendering the size picker — assert by looking for the "Page size:"
    // step prompt that the size step renders.
    const sizeStepProbe = page.locator('text=Page size:')
    expect(await sizeStepProbe.count()).toBe(0)
    await page.locator('[data-testid="add-page-inherit"]').click()
    // Dialog dismissed.
    await expect(page.locator('.tg-dialog-title', { hasText: 'Add New Page' })).toBeHidden()

    // The new page should carry forward the previous page's dimensions
    // verbatim — that's the "inherit" contract. `snapshotSameAsPrevious`
    // in `usePageHandlers` materialises the previous page's background
    // (color in this seed) directly into the new page, so the stored
    // `backgroundType` matches the previous page rather than literally
    // being `'inherit'`. The visible behaviour is identical.
    const pages = await readPages(page)
    expect(pages?.length).toBe(2)
    const newPage = pages?.find((p) => p.index === 1)
    expect(newPage?.backgroundType).toBe('color')
    expect(newPage?.backgroundColor).toBe('#ffffff')
    expect(newPage?.width).toBe(595)
    expect(newPage?.height).toBe(842)
  })

  test('Solid color routes through the size step (asks for dimensions)', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openAddPage(page)

    await page.locator('button', { hasText: /Solid color/ }).click()
    // Color step.
    await page.locator('button', { hasText: /Next: page size/ }).click()
    // Size step is visible.
    await expect(page.locator('text=Page size:')).toBeVisible()
    // "Same as previous (... × ... pt)" radio is the default for "previous".
    await expect(page.locator(`text=Same as previous (595 × 842 pt)`)).toBeVisible()
  })

  test('Size picker labels do not advertise a country (no "US Letter" / "US Legal")', async ({
    page,
  }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openAddPage(page)
    await page.locator('button', { hasText: /Solid color/ }).click()
    await page.locator('button', { hasText: /Next: page size/ }).click()
    await expect(page.locator('text=Page size:')).toBeVisible()

    const dialog = page.locator('.tg-dialog')
    const text = (await dialog.textContent()) ?? ''
    expect(text).toMatch(/Letter \(/)
    expect(text).toMatch(/Legal \(/)
    expect(text).not.toMatch(/US Letter/)
    expect(text).not.toMatch(/US Legal/)
  })

  test('selecting Custom does not change the dialog bounding box', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openAddPage(page)
    await page.locator('button', { hasText: /Solid color/ }).click()
    await page.locator('button', { hasText: /Next: page size/ }).click()
    await expect(page.locator('text=Page size:')).toBeVisible()

    const dialog = page.locator('.tg-dialog')
    const before = await dialog.boundingBox()
    expect(before).not.toBeNull()

    // Click the Custom radio.
    await page.locator('label', { hasText: /^Custom$/ }).click()

    // Layout settles; capture again.
    const after = await dialog.boundingBox()
    expect(after).not.toBeNull()

    // Width and height should be identical (or within sub-pixel rounding).
    // Previously the dialog grew by ~70px in height when Custom was
    // picked; the reserved-slot fix in `PageSizePicker.tsx` keeps the
    // bounds stable.
    expect(Math.abs((after!.width ?? 0) - (before!.width ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((after!.height ?? 0) - (before!.height ?? 0))).toBeLessThanOrEqual(1)
  })

  test('Image upload shows "Match image" as the first option, pre-selected with natural dimensions', async ({
    page,
  }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openAddPage(page)

    // 4×4 red PNG — distinct natural dimensions from the seeded page
    // (595×842 A4) so the "Match image" radio's label is unambiguous.
    const TINY_PNG_BYTES = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4XmP8z8AARBgAcwBQEgEDA' +
        'XAGRgwAAAAASUVORK5CYII=',
      'base64',
    )

    // Drive the hidden file input scoped inside the dialog (other file
    // inputs exist on the page — toolbar Open .tgbl, FontManager, etc.).
    await page
      .locator('.tg-dialog input[type="file"][accept="image/*"]')
      .setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: TINY_PNG_BYTES })

    // Size step renders. Match image must be the FIRST radio (above
    // Same as previous), labelled with the decoded natural size (4×4).
    await expect(page.locator('text=Page size:')).toBeVisible()
    const matchLabel = page.locator('label', { hasText: /^Match image \(4 × 4 pt\)/ })
    await expect(matchLabel).toBeVisible()

    // First radio in the picker = match image. Verify by reading every
    // visible label's text content in DOM order and checking index 0
    // mentions "Match image".
    const labels = await page
      .locator('.tg-dialog label')
      .filter({ hasText: /(Match image|Same as previous|A4|A3|A5|Letter|Legal|Custom)/ })
      .allTextContents()
    expect(labels[0]).toMatch(/Match image/)

    // Default selection should be Match image.
    const matchRadio = matchLabel.locator('input[type="radio"]')
    await expect(matchRadio).toBeChecked()

    // Confirm Add Page → the new page's stored dimensions equal the
    // image's natural size (4×4 pt), proving the match path resolved
    // correctly even though preset radios for A4/Letter/etc. are
    // available alongside.
    await page.getByRole('button', { name: 'Add Page', exact: true }).click()

    // Image-bg pages persist async (FileReader → addPage). Poll until
    // the new page lands.
    await expect.poll(async () => (await readPages(page))?.length ?? 0, { timeout: 5000 }).toBe(2)
    const pages = await readPages(page)
    const newPage = pages?.find((p) => p.index === 1)
    expect(newPage?.width).toBe(4)
    expect(newPage?.height).toBe(4)
    expect(newPage?.backgroundType).toBe('image')
  })

  test('custom width/height inputs are tab-skipped while a preset is selected', async ({
    page,
  }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openAddPage(page)
    await page.locator('button', { hasText: /Solid color/ }).click()
    await page.locator('button', { hasText: /Next: page size/ }).click()
    await expect(page.locator('text=Page size:')).toBeVisible()

    // The custom block is rendered (reserved slot) but `tabIndex={-1}`
    // when not the selected option, and `aria-hidden="true"`. Both probes:
    const widthInput = page.locator('input[type="number"]').first()
    expect(await widthInput.evaluate((el) => (el as HTMLInputElement).tabIndex)).toBe(-1)
    expect(
      await widthInput.evaluate((el) => el.closest('[aria-hidden]')?.getAttribute('aria-hidden')),
    ).toBe('true')

    // After picking Custom, the inputs become tab-reachable.
    await page.locator('label', { hasText: /^Custom$/ }).click()
    expect(await widthInput.evaluate((el) => (el as HTMLInputElement).tabIndex)).toBe(0)
    expect(
      await widthInput.evaluate((el) => el.closest('[aria-hidden]')?.getAttribute('aria-hidden')),
    ).toBe('false')
  })
})
