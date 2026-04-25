/**
 * E2E for GH #25 + #26 in one place — both share the field-source/style
 * write paths so the smoke flow is the same.
 *
 *  GH #25 — sidebar ↔ canvas ↔ JSON sync. Editing a field property in the
 *  properties (left) panel must (a) update the field on the canvas
 *  immediately and (b) update the JSON preview on the right panel.
 *
 *  GH #26 — Static / Dynamic mode toggle. Flipping the mode toggle must
 *  migrate the user's content (value ↔ placeholder) and swap the visible
 *  inputs per the matrix.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

const TEXT_STYLE = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontSizeDynamic: false,
  fontSizeMin: 8,
  lineHeight: 1.2,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#1e40af',
  align: 'center',
  verticalAlign: 'top',
  maxRows: 2,
  overflowMode: 'truncate',
  snapToGrid: false,
}

async function seed(page: Page, source: Record<string, unknown>): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'sync-mode-test',
        version: '0.0.0',
        width: 600,
        height: 500,
        locked: false,
      },
      fields: [
        {
          id: 'f1',
          type: 'text',
          label: 'f1',
          groupId: null,
          pageId: null,
          x: 60,
          y: 60,
          width: 200,
          height: 100,
          zIndex: 0,
          source,
          style: TEXT_STYLE,
        },
      ],
      fonts: [],
      groups: [],
      pages: [
        {
          id: 'p',
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
    localStorage.setItem('template-goblin-template', s)
    localStorage.removeItem('template-goblin-ui')
  }, JSON.stringify(payload))
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

async function readFieldStore(page: Page): Promise<{ source: { mode: string } } | null> {
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
      state: { fields: Array<{ id: string; source: { mode: string } }> }
    }
    return parsed.state.fields.find((f) => f.id === 'f1') ?? null
  })
}

async function readLabelFontSize(page: Page): Promise<number> {
  return await page.evaluate(() => {
    interface FabricLike {
      getObjects: () => Array<{
        __fieldId?: string
        getObjects?: () => Array<{ fontSize?: number; text?: string }>
      }>
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) return 0
    const g = fc.getObjects().find((o) => o.__fieldId === 'f1')
    if (!g?.getObjects) return 0
    const label = g.getObjects().find((c) => typeof c.text === 'string' && c.text.length > 0)
    return label?.fontSize ?? 0
  })
}

test.describe('GH #25 — sidebar updates flow to canvas + JSON preview', () => {
  test('changing the placeholder shows up in the JSON preview', async ({ page }) => {
    await seed(page, {
      mode: 'dynamic',
      jsonKey: 'name',
      required: false,
      placeholder: null,
    })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    // Click the field to focus the properties panel.
    await page.locator('.tg-field-item').first().click()

    // Type a placeholder — the JSON preview must reflect it as texts.name.
    const placeholderInput = page
      .locator('label', { hasText: /^Placeholder$/ })
      .locator('..')
      .locator('input')
    await placeholderInput.fill('Sample Name')

    // The right panel renders the JSON in <pre> (or <code>); look for the
    // serialized value as plain text.
    await expect(page.locator('.tg-right-panel')).toContainText('"name"')
    await expect(page.locator('.tg-right-panel')).toContainText('"Sample Name"')
  })
})

test.describe('GH #26 — Static / Dynamic mode toggle migrates content', () => {
  test('static → dynamic carries the static value into placeholder', async ({ page }) => {
    await seed(page, { mode: 'static', value: 'Hello world' })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.locator('.tg-field-item').first().click()

    // Initially Static is the active tab.
    await expect(page.locator('[data-testid="source-mode-static"]')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // Static UI shows a Value input.
    await expect(page.locator('[data-testid="text-static-value"]')).toBeVisible()

    // Flip to Dynamic.
    await page.locator('[data-testid="source-mode-dynamic"]').click()

    await expect(page.locator('[data-testid="source-mode-dynamic"]')).toHaveAttribute(
      'aria-selected',
      'true',
    )

    // Verify the migration in the persist blob.
    const field = await readFieldStore(page)
    expect(field?.source.mode).toBe('dynamic')
    if (field && field.source.mode === 'dynamic') {
      const dyn = field.source as unknown as { placeholder: string; jsonKey: string }
      expect(dyn.placeholder).toBe('Hello world')
      expect(dyn.jsonKey).toMatch(/^text_\d+$/)
    }
  })

  test('dynamic → static carries the placeholder into value', async ({ page }) => {
    await seed(page, {
      mode: 'dynamic',
      jsonKey: 'greeting',
      required: false,
      placeholder: 'Hi there',
    })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.locator('.tg-field-item').first().click()

    await page.locator('[data-testid="source-mode-static"]').click()

    const field = await readFieldStore(page)
    expect(field?.source.mode).toBe('static')
    if (field && field.source.mode === 'static') {
      const stat = field.source as unknown as { value: string }
      expect(stat.value).toBe('Hi there')
    }
    // Static Value input now shows the carried-over text.
    await expect(page.locator('[data-testid="text-static-value"]')).toHaveValue('Hi there')
  })

  test('resizing a static text field writes the fitted fontSize back to the store', async ({
    page,
  }) => {
    await seed(page, { mode: 'static', value: 'Resize me' })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.locator('.tg-field-item').first().click()

    // Trigger the same store path the canvas resize-handle uses.
    await page.evaluate(() => {
      interface FabricLike {
        getObjects: () => Array<{
          __fieldId?: string
          set?: (props: Record<string, number>) => void
          setCoords?: () => void
        }>
        fire?: (ev: string, opt: Record<string, unknown>) => void
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      if (!fc) throw new Error('no fabric canvas')
      const g = fc.getObjects().find((o) => o.__fieldId === 'f1')
      if (!g) throw new Error('group missing')
      g.set?.({ width: 80, height: 30, scaleX: 1, scaleY: 1 })
      g.setCoords?.()
      fc.fire?.('object:modified', { target: g })
    })

    // Static text writes the fitted fontSize back into `style.fontSize` so
    // the sidebar reflects what the user actually sees on the canvas.
    await expect
      .poll(async () => {
        const blob = await readFieldStore(page)
        const style = (blob as unknown as { style?: { fontSize?: number } } | null)?.style
        return style?.fontSize ?? -1
      })
      .toBeLessThan(16)
  })

  test('canvas label fontSize honours the field style (sync from sidebar)', async ({ page }) => {
    await seed(page, { mode: 'static', value: 'Hi' })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.locator('.tg-field-item').first().click()

    // Static text doesn't auto-fit, so the canvas label fontSize is bounded by
    // the configured fontSize (16) clamped by the rect-fit upper bound. Either
    // way it must be ≤ 16 and not the old per-type default.
    const fs = await readLabelFontSize(page)
    expect(fs).toBeLessThanOrEqual(16)
    expect(fs).toBeGreaterThan(0)
  })
})
