/**
 * E2E for the interactive Preview dialog (#45).
 *
 * Replaces the old "click Preview → instant new tab" flow. The dialog now
 * mediates: pre-fills a JSON editor with the same default values the
 * auto-trigger used to use, lets the user edit them and (optionally)
 * upload images, then runs the render only on Render. These specs cover:
 *
 *   1. Dialog opens on Preview click and closes on Cancel.
 *   2. Editing a text value flows through to the rendered preview.
 *   3. Invalid JSON disables Render and surfaces an error.
 *   4. Uploading a PNG overrides the placeholder bitmap on Render.
 *   5. ESC closes the dialog without rendering.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

const TINY_PNG =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4XmP8z8AARBgAcwBQEgEDA' +
  'XAGRgwAAAAASUVORK5CYII='

// 4×4 blue PNG — distinct from TINY_PNG so the upload-override test can
// tell them apart visually if needed.
const BLUE_PNG =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR4XmNkYGD4z8DAwMgABFAGA' +
  'AYbAQEDjC1nAAAAAElFTkSuQmCC'

const TEXT_STYLE = {
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
}

interface SeedOpts {
  withImageField: boolean
}

async function seed(page: Page, { withImageField }: SeedOpts): Promise<void> {
  const fields: Record<string, unknown>[] = [
    {
      id: 'greeting',
      type: 'text',
      label: 'greeting',
      groupId: null,
      pageId: 'p0',
      x: 50,
      y: 50,
      width: 400,
      height: 80,
      zIndex: 0,
      source: { mode: 'dynamic', jsonKey: 'greeting', required: false, placeholder: 'Hi' },
      style: TEXT_STYLE,
    },
  ]
  if (withImageField) {
    fields.push({
      id: 'photo',
      type: 'image',
      label: 'photo',
      groupId: null,
      pageId: 'p0',
      x: 50,
      y: 200,
      width: 200,
      height: 150,
      zIndex: 1,
      source: {
        mode: 'dynamic',
        jsonKey: 'photo',
        required: false,
        placeholder: { filename: 'photo-placeholder.png' },
      },
      style: { fit: 'contain' },
    })
  }
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'preview-dialog-test',
        version: '0.0.0',
        width: 600,
        height: 500,
        locked: false,
      },
      fields,
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
      ],
      backgroundDataUrl: null,
      backgroundBuffer: null,
      pageBackgroundDataUrls: [],
      pageBackgroundBuffers: [],
      fontBuffers: [],
      placeholderBuffers: [],
      staticImageBuffers: [],
      // The image field's placeholder bitmap goes here so it's resolvable
      // synchronously when the dialog mounts (mirrors how a real template
      // would have its placeholder loaded after open).
      staticImageDataUrls: withImageField ? [['photo-placeholder.png', TINY_PNG]] : [],
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

async function openDialog(page: Page): Promise<void> {
  await page.locator('[data-testid="toolbar-preview"]').click()
  await expect(page.locator('[data-testid="preview-dialog"]')).toBeVisible()
}

test.describe('Preview dialog (#45)', () => {
  test('clicking Preview opens the dialog instead of jumping straight to a new tab', async ({
    page,
    context,
  }) => {
    await seed(page, { withImageField: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()

    // Sanity: confirm no new pages spawned during open. We capture the count
    // BEFORE clicking and assert the same count immediately after.
    const beforeCount = context.pages().length
    await openDialog(page)

    // Pre-filled JSON contains the field's placeholder/default value.
    const editorValue = await page.locator('[data-testid="preview-json-editor"]').inputValue()
    expect(editorValue).toContain('greeting')
    // After opening the dialog the user is still on the editor page only.
    expect(context.pages().length).toBe(beforeCount)
  })

  test('Cancel dismisses the dialog without rendering', async ({ page, context }) => {
    await seed(page, { withImageField: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openDialog(page)

    const beforeCount = context.pages().length
    await page.locator('[data-testid="preview-cancel"]').click()
    await expect(page.locator('[data-testid="preview-dialog"]')).toBeHidden()
    expect(context.pages().length).toBe(beforeCount)
  })

  test('ESC closes the dialog without rendering', async ({ page, context }) => {
    await seed(page, { withImageField: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openDialog(page)

    const beforeCount = context.pages().length
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="preview-dialog"]')).toBeHidden()
    expect(context.pages().length).toBe(beforeCount)
  })

  test('invalid JSON disables Render and shows the parse error', async ({ page }) => {
    await seed(page, { withImageField: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openDialog(page)

    const editor = page.locator('[data-testid="preview-json-editor"]')
    await editor.fill('{not json')

    await expect(page.locator('[data-testid="preview-json-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="preview-render"]')).toBeDisabled()
  })

  test('editing a text value flows through to the rendered preview', async ({ page, context }) => {
    await seed(page, { withImageField: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openDialog(page)

    // Replace the JSON wholesale with a value the user typed.
    await page
      .locator('[data-testid="preview-json-editor"]')
      .fill(JSON.stringify({ texts: { greeting: 'CUSTOM-PREVIEW-VALUE' } }, null, 2))

    const popupPromise = context.waitForEvent('page')
    await page.locator('[data-testid="preview-render"]').click()
    const previewPage = await popupPromise
    await previewPage.waitForLoadState('domcontentloaded')

    // The renderer prints text values directly into the page HTML, so we
    // can grep for the user's string. Use a regex match against body text
    // to absorb any wrapping whitespace.
    await expect(previewPage.locator('body')).toContainText('CUSTOM-PREVIEW-VALUE')
    // And the original placeholder should NOT appear (it was replaced).
    await expect(previewPage.locator('body')).not.toContainText(/^Hi$/)
  })

  test('uploading a PNG overrides the placeholder bitmap in the rendered preview', async ({
    page,
    context,
  }) => {
    await seed(page, { withImageField: true })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openDialog(page)

    // Convert BLUE_PNG (data URL) into a Buffer + Playwright file payload.
    const base64 = BLUE_PNG.split(',')[1] ?? ''
    const buffer = Buffer.from(base64, 'base64')

    await page
      .locator('[data-testid="preview-upload-input-photo"]')
      .setInputFiles({ name: 'blue.png', mimeType: 'image/png', buffer })

    // Confirm the row now reads "Uploaded" (visual sanity that state moved).
    await expect(page.locator('text=Uploaded')).toBeVisible()

    const popupPromise = context.waitForEvent('page')
    await page.locator('[data-testid="preview-render"]').click()
    const previewPage = await popupPromise
    await previewPage.waitForLoadState('domcontentloaded')

    // The renderer emits `<img src="data:image/...;base64,...">` for
    // resolved bitmaps. Assert a substring TAKEN FROM THE MIDDLE of the
    // uploaded PNG's base64 (where it actually diverges from the placeholder
    // — the leading `iVBORw0KGgo…` PNG signature is identical between any
    // two PNGs and would false-positive). Confirms the override flowed
    // through, not the placeholder.
    const html = await previewPage.content()
    const uploadedMid = base64.slice(40, 70)
    expect(uploadedMid.length).toBeGreaterThan(20)
    expect(html).toContain(uploadedMid)
    // And the placeholder's distinctive middle bytes should NOT appear.
    const placeholderBase64 = TINY_PNG.split(',')[1] ?? ''
    const placeholderMid = placeholderBase64.slice(40, 70)
    expect(html).not.toContain(placeholderMid)
  })

  test('uploading to an image field WITHOUT a placeholder still overrides the rendered bitmap', async ({
    page,
    context,
  }) => {
    // Seed manually — the helper above always wires a placeholder. The
    // renderer falls back to `jsonKey` as the lookup key when there's no
    // placeholder filename, so the override path needs to mirror that.
    const fields: Record<string, unknown>[] = [
      {
        id: 'free-img',
        type: 'image',
        label: 'free-img',
        groupId: null,
        pageId: 'p0',
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        zIndex: 0,
        // Dynamic image with NO placeholder — the failure mode the master
        // QA flagged before this change shipped.
        source: { mode: 'dynamic', jsonKey: 'free_img', required: false, placeholder: null },
        style: { fit: 'contain' },
      },
    ]
    const payload = {
      state: {
        meta: {
          schemaVersion: 1,
          name: 'preview-dialog-test',
          version: '0.0.0',
          width: 600,
          height: 500,
          locked: false,
        },
        fields,
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
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openDialog(page)

    const base64 = BLUE_PNG.split(',')[1] ?? ''
    const buffer = Buffer.from(base64, 'base64')
    await page
      .locator('[data-testid="preview-upload-input-free_img"]')
      .setInputFiles({ name: 'blue.png', mimeType: 'image/png', buffer })

    const popupPromise = context.waitForEvent('page')
    await page.locator('[data-testid="preview-render"]').click()
    const previewPage = await popupPromise
    await previewPage.waitForLoadState('domcontentloaded')

    const html = await previewPage.content()
    const uploadedMid = base64.slice(40, 70)
    expect(html).toContain(uploadedMid)
  })

  test('clicking the ✕ close button dismisses the dialog without rendering', async ({
    page,
    context,
  }) => {
    await seed(page, { withImageField: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openDialog(page)

    const beforeCount = context.pages().length
    await page.locator('[data-testid="preview-close"]').click()
    await expect(page.locator('[data-testid="preview-dialog"]')).toBeHidden()
    expect(context.pages().length).toBe(beforeCount)
  })

  test('Reset to defaults restores the auto-generated JSON', async ({ page }) => {
    await seed(page, { withImageField: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openDialog(page)

    const editor = page.locator('[data-testid="preview-json-editor"]')
    const original = await editor.inputValue()
    await editor.fill('{"texts":{"greeting":"edited"}}')
    expect(await editor.inputValue()).not.toBe(original)

    await page.locator('[data-testid="preview-reset"]').click()
    expect(await editor.inputValue()).toBe(original)
  })
})
