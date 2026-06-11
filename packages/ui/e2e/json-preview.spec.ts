/**
 * E2E for the right-panel JSON Preview — single-source projection.
 *
 * The JSON panel is a live projection of the fields: every field add /
 * remove / mode-flip appears immediately (no pin to freeze it), and
 * editing a VALUE in the textarea writes through to the owning field's
 * placeholder. These tests drive the real app through the exact flows
 * that used to break under the old pinned-JSON design:
 *   - the SECOND field added not appearing,
 *   - static → dynamic flips not appearing,
 *   - edits freezing the panel forever.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

const BASE_CELL = {
  fontFamily: 'Helvetica',
  fontSize: 10,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  backgroundColor: '#ffffff',
  borderWidth: 0,
  borderColor: '#cccccc',
  paddingTop: 2,
  paddingBottom: 2,
  paddingLeft: 4,
  paddingRight: 4,
  align: 'left',
  verticalAlign: 'top',
}

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

function tableStyle(columns: Array<{ key: string; label: string; width: number }>) {
  return {
    maxRows: 5,
    maxColumns: 8,
    multiPage: false,
    showHeader: true,
    headerStyle: { ...BASE_CELL, fontWeight: 'bold', backgroundColor: '#eeeeee' },
    rowStyle: BASE_CELL,
    oddRowStyle: null,
    evenRowStyle: null,
    cellStyle: { overflowMode: 'truncate' },
    columns: columns.map((c) => ({ ...c, style: null, headerStyle: null })),
  }
}

function textFieldPayload(id: string, jsonKey: string, placeholder: string | null) {
  return {
    id,
    type: 'text',
    label: id,
    groupId: null,
    pageId: 'p0',
    x: 50,
    y: 50,
    width: 400,
    height: 80,
    zIndex: 0,
    source: { mode: 'dynamic', jsonKey, required: false, placeholder },
    style: TEXT_STYLE,
  }
}

async function seed(page: Page): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'json-preview-test',
        version: '0.0.0',
        width: 600,
        height: 500,
        locked: false,
      },
      fields: [
        textFieldPayload('greeting', 'greeting', 'Hi'),
        {
          id: 'tbl1',
          type: 'table',
          label: 'tbl1',
          groupId: null,
          pageId: 'p0',
          x: 50,
          y: 200,
          width: 400,
          height: 200,
          zIndex: 1,
          source: { mode: 'dynamic', jsonKey: 'rows', required: true, placeholder: null },
          style: tableStyle([
            { key: 'a', label: 'A', width: 100 },
            { key: 'b', label: 'B', width: 100 },
          ]),
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

function textarea(page: Page) {
  return page.locator('[data-testid="json-preview-textarea"]')
}

function notice(page: Page) {
  return page.locator('[data-testid="json-preview-notice"]')
}

interface StoreLike {
  getState(): {
    fields: Array<{
      id: string
      source?: { mode: string; jsonKey?: string; placeholder?: unknown }
    }>
    addField: (f: object) => void
    setFieldMode: (id: string, mode: 'static' | 'dynamic') => void
  }
}

async function addTextField(page: Page, id: string, jsonKey: string): Promise<void> {
  await page.evaluate(
    ({ field }) => {
      const store = (window as unknown as { __templateStore?: StoreLike }).__templateStore
      store?.getState().addField(field)
    },
    { field: textFieldPayload(id, jsonKey, null) },
  )
}

test.describe('JSON Preview — single-source projection', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(textarea(page)).toBeVisible()
  })

  test('projection is already 2-space formatted on load', async ({ page }) => {
    const value = await textarea(page).inputValue()
    expect(value).toContain('"greeting"')
    expect(value).toMatch(/\n {2}"/)
  })

  test('a SECOND field added always appears (the original sync bug)', async ({ page }) => {
    await addTextField(page, 'extra1', 'first_extra')
    await expect.poll(() => textarea(page).inputValue()).toContain('"first_extra"')
    await addTextField(page, 'extra2', 'second_extra')
    await expect.poll(() => textarea(page).inputValue()).toContain('"second_extra"')
    expect(await textarea(page).inputValue()).toContain('"first_extra"')
  })

  test('a field still appears even after the user has edited the JSON', async ({ page }) => {
    // Pre-refactor: any edit pinned the JSON and froze it forever.
    const edited = (await textarea(page).inputValue()).replace('"Hi"', '"Hello"')
    await textarea(page).fill(edited)
    await textarea(page).blur()
    await addTextField(page, 'extra3', 'after_edit')
    await expect.poll(() => textarea(page).inputValue()).toContain('"after_edit"')
    // And the earlier edit survived — it lives in the field placeholder now.
    expect(await textarea(page).inputValue()).toContain('"Hello"')
  })

  test('static → dynamic flip surfaces the key immediately', async ({ page }) => {
    await page.evaluate(() => {
      const store = (window as unknown as { __templateStore?: StoreLike }).__templateStore
      store?.getState().setFieldMode('greeting', 'static')
    })
    await expect.poll(() => textarea(page).inputValue()).not.toContain('"greeting"')
    await page.evaluate(() => {
      const store = (window as unknown as { __templateStore?: StoreLike }).__templateStore
      store?.getState().setFieldMode('greeting', 'dynamic')
    })
    await expect.poll(() => textarea(page).inputValue()).toContain('"texts"')
    // setFieldMode generates a fresh text_N key; the texts bucket must be
    // non-empty again.
    const parsed = JSON.parse(await textarea(page).inputValue()) as {
      texts: Record<string, string>
    }
    expect(Object.keys(parsed.texts).length).toBeGreaterThan(0)
  })

  test('editing a text value writes through to the field placeholder', async ({ page }) => {
    const edited = (await textarea(page).inputValue()).replace('"Hi"', '"Namaste"')
    await textarea(page).fill(edited)
    const placeholder = await page.evaluate(() => {
      const store = (window as unknown as { __templateStore?: StoreLike }).__templateStore
      const f = store?.getState().fields.find((x) => x.id === 'greeting')
      return f?.source && 'placeholder' in f.source ? f.source.placeholder : null
    })
    expect(placeholder).toBe('Namaste')
    // Blur snaps back to the canonical projection — which includes the edit.
    await textarea(page).blur()
    await expect.poll(() => textarea(page).inputValue()).toContain('"Namaste"')
  })

  test('an unknown key shows an inline notice and is dropped on blur', async ({ page }) => {
    const value = await textarea(page).inputValue()
    const parsed = JSON.parse(value) as { texts: Record<string, string> }
    parsed.texts.ghost_key = 'boo'
    await textarea(page).fill(JSON.stringify(parsed, null, 2))
    await expect(notice(page)).toBeVisible()
    await expect(notice(page)).toContainText('ghost_key')
    await textarea(page).blur()
    await expect.poll(() => textarea(page).inputValue()).not.toContain('ghost_key')
  })

  test('invalid JSON shows a notice and reverts on blur without breaking anything', async ({
    page,
  }) => {
    const before = await textarea(page).inputValue()
    await textarea(page).fill('{not valid json')
    await expect(notice(page)).toBeVisible()
    await expect(notice(page)).toContainText(/Invalid JSON/i)
    await textarea(page).blur()
    await expect.poll(() => textarea(page).inputValue()).toBe(before)
  })

  test('adding a table column updates the projection', async ({ page }) => {
    // First click anywhere collapses the ribbon (#159) and reflows the
    // panels, swallowing that click — spend it on the textarea so the
    // add-column click below lands reliably.
    await textarea(page).click()
    await page.evaluate(() => {
      interface FabricLike {
        getObjects(): Array<{ __fieldId?: string }>
        setActiveObject: (o: object) => void
        requestRenderAll: () => void
        fire?: (event: string, opts: object) => void
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      const g = fc?.getObjects().find((o) => o.__fieldId === 'tbl1')
      if (!fc || !g) return
      fc.setActiveObject(g as object)
      fc.fire?.('selection:created', { selected: [g] })
      fc.requestRenderAll()
    })
    await expect(page.locator('[data-testid="loop-add-column"]')).toBeVisible()
    const before = await textarea(page).inputValue()
    await page.locator('[data-testid="loop-add-column"]').click()
    await expect.poll(async () => textarea(page).inputValue(), { timeout: 3000 }).not.toBe(before)
  })

  test('clicking inside the textarea does NOT select the whole content', async ({ page }) => {
    const ta = textarea(page)
    await ta.click()
    const selection = await ta.evaluate((el) => {
      const t = el as HTMLTextAreaElement
      return { start: t.selectionStart, end: t.selectionEnd, len: t.value.length }
    })
    expect(selection.end - selection.start).toBe(0)
    expect(selection.end).toBeLessThan(selection.len)
  })
})
