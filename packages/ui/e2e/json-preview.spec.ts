/**
 * E2E for the right-panel JSON Preview (#85).
 *
 * Covers the Format button, the Cmd/Ctrl+Shift+F shortcut, the inline
 * error path on invalid JSON, the click-doesn't-select-all behaviour
 * (pre-fix the right-panel auto-select-on-focus wiped the textarea on
 * the first keystroke), and the regression case where Format on the
 * unpinned auto-generated text used to pin the snapshot and freeze it
 * from tracking subsequent field edits.
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

function formatBtn(page: Page) {
  return page.locator('[data-testid="json-preview-format"]')
}

function resetBtn(page: Page) {
  return page.locator('[data-testid="json-preview-reset"]')
}

function formatError(page: Page) {
  return page.locator('[data-testid="json-preview-format-error"]')
}

async function selectField(page: Page, fieldId: string): Promise<void> {
  await page.evaluate((id: string) => {
    interface FabricLike {
      getObjects(): Array<{ __fieldId?: string }>
      setActiveObject: (o: object) => void
      requestRenderAll: () => void
      fire?: (event: string, opts: object) => void
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) return
    const g = fc.getObjects().find((o) => o.__fieldId === id)
    if (!g) return
    fc.setActiveObject(g as object)
    fc.fire?.('selection:created', { selected: [g] })
    fc.requestRenderAll()
  }, fieldId)
}

test.describe('JSON Preview (#85)', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(textarea(page)).toBeVisible()
  })

  test('auto-generated text is already 2-space formatted on load', async ({ page }) => {
    const value = await textarea(page).inputValue()
    expect(value).toContain('"greeting"')
    expect(value).toMatch(/\n {2}"/)
  })

  test('Format on a pinned-edited textarea pretty-prints the user input', async ({ page }) => {
    // Type a minified object — onChange pins it.
    await textarea(page).fill('{"texts":{"greeting":"hello"},"tables":{"rows":[]}}')
    await formatBtn(page).click()
    const formatted = await textarea(page).inputValue()
    expect(formatted).toBe(
      '{\n  "texts": {\n    "greeting": "hello"\n  },\n  "tables": {\n    "rows": []\n  }\n}',
    )
    // Reset button should now be visible — the textarea is pinned.
    await expect(resetBtn(page)).toBeVisible()
  })

  test('Format is a no-op when the textarea is showing the auto-generated baseline', async ({
    page,
  }) => {
    // Reset is hidden because nothing is pinned.
    await expect(resetBtn(page)).toHaveCount(0)
    const before = await textarea(page).inputValue()
    await formatBtn(page).click()
    const after = await textarea(page).inputValue()
    expect(after).toBe(before)
    // Still not pinned — Reset stays hidden.
    await expect(resetBtn(page)).toHaveCount(0)
  })

  test('adding a table column updates the auto-generated preview AFTER Format was clicked', async ({
    page,
  }) => {
    // Repro of the bug user reported on #85: Format used to pin the
    // snapshot, freezing the preview from tracking subsequent edits.
    await formatBtn(page).click()
    await selectField(page, 'tbl1')
    await expect(page.locator('[data-testid="loop-add-column"]')).toBeVisible()

    const before = await textarea(page).inputValue()
    await page.locator('[data-testid="loop-add-column"]').click()

    // The auto-generated JSON should grow to reflect the new column key —
    // the default table row stamps every column key with an example value.
    await expect.poll(async () => textarea(page).inputValue(), { timeout: 3000 }).not.toBe(before)
  })

  test('Format on invalid JSON surfaces an inline error and leaves text unchanged', async ({
    page,
  }) => {
    const broken = '{not valid json'
    await textarea(page).fill(broken)
    await formatBtn(page).click()
    await expect(formatError(page)).toBeVisible()
    await expect(formatError(page)).toContainText(/Invalid JSON/i)
    expect(await textarea(page).inputValue()).toBe(broken)
  })

  test('inline error auto-clears within ~3 seconds', async ({ page }) => {
    await textarea(page).fill('{not valid json')
    await formatBtn(page).click()
    await expect(formatError(page)).toBeVisible()
    await expect(formatError(page)).toHaveCount(0, { timeout: 5000 })
  })

  test('Cmd/Ctrl+Shift+F inside the textarea formats the JSON', async ({ page }) => {
    await textarea(page).fill('{"texts":{"greeting":"x"}}')
    await textarea(page).focus()
    // Use Control+Shift+F — Playwright honours it on all platforms.
    await page.keyboard.press('Control+Shift+F')
    const formatted = await textarea(page).inputValue()
    expect(formatted).toBe('{\n  "texts": {\n    "greeting": "x"\n  }\n}')
  })

  test('clicking inside the textarea does NOT select the whole content', async ({ page }) => {
    // Pre-fix: the right-panel select-all-on-focus would select the
    // entire textarea on click, so the next keystroke would wipe the
    // user's JSON. Now textareas are skipped.
    const ta = textarea(page)
    await ta.click()
    const selection = await ta.evaluate((el) => {
      const t = el as HTMLTextAreaElement
      return { start: t.selectionStart, end: t.selectionEnd, len: t.value.length }
    })
    // A click should leave a zero-width selection (caret) somewhere
    // inside the buffer, NOT a full-content range.
    expect(selection.end - selection.start).toBe(0)
    expect(selection.end).toBeLessThan(selection.len)
  })

  test('Reset clears the pin and returns to auto-generated text', async ({ page }) => {
    await textarea(page).fill('{"custom":"value"}')
    await expect(resetBtn(page)).toBeVisible()
    await resetBtn(page).click()
    await expect(resetBtn(page)).toHaveCount(0)
    const value = await textarea(page).inputValue()
    expect(value).toContain('"greeting"')
  })

  test('subsequent successful Format clears a previously-shown error', async ({ page }) => {
    await textarea(page).fill('{not valid json')
    await formatBtn(page).click()
    await expect(formatError(page)).toBeVisible()
    // Fix it and re-format — the error should disappear immediately,
    // not wait for the 3s timer.
    await textarea(page).fill('{"a":1}')
    await formatBtn(page).click()
    await expect(formatError(page)).toHaveCount(0)
    expect(await textarea(page).inputValue()).toBe('{\n  "a": 1\n}')
  })
})
