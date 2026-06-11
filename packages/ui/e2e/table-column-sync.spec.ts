/**
 * E2E for GH #38: adding / removing a column on a table field via the
 * right-panel must propagate to the canvas. Pre-fix the canvas drew a
 * single labelled rect for any table regardless of `style.columns`, so
 * `+ Add Column` updated the store but produced zero visual change.
 *
 * The canvas now emits column-divider Lines and per-column header label
 * Textboxes (see `tableCanvasParts.ts`), so the field group's child count
 * is a reliable proxy: it grows when a column is added and shrinks when
 * one is removed.
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
        name: 'table-column-sync-test',
        version: '0.0.0',
        width: 1000,
        height: 800,
        locked: false,
      },
      fields: [
        {
          id: 'tbl1',
          type: 'table',
          label: 'tbl1',
          groupId: null,
          pageId: null,
          x: 100,
          y: 200,
          width: 400,
          height: 200,
          zIndex: 0,
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

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

/**
 * Count how many Fabric children the table group has on the canvas. The
 * table group always carries a bgRect; column dividers and header labels
 * pile on top, so the count grows monotonically with column count.
 */
async function readGroupChildCount(page: Page, fieldId: string): Promise<number> {
  return await page.evaluate((id: string) => {
    interface FabricLike {
      getObjects(): Array<{
        __fieldId?: string
        getObjects?: () => unknown[]
      }>
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) return 0
    const g = fc.getObjects().find((o) => o.__fieldId === id)
    if (!g?.getObjects) return 0
    return g.getObjects().length
  }, fieldId)
}

/** Make the right-panel `LoopFieldProps` panel visible by selecting the field. */
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
    // Fire selection:created so any listeners syncing the right panel run.
    fc.fire?.('selection:created', { selected: [g] })
    fc.requestRenderAll()
  }, fieldId)
}

test.describe('Table column sync (#38)', () => {
  test('adding a column via the right panel grows the canvas group child count', async ({
    page,
  }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()

    const baseline = await readGroupChildCount(page, 'tbl1')
    expect(baseline).toBeGreaterThan(0)

    await selectField(page, 'tbl1')
    // The right-panel LoopFieldProps mounts when a table field is selected.
    await expect(page.locator('[data-testid="loop-add-column"]')).toBeVisible()

    await page.locator('[data-testid="loop-add-column"]').click()

    // Reconcile is synchronous on store update; poll to absorb a render
    // tick and let the e2e be robust under load.
    await expect
      .poll(async () => readGroupChildCount(page, 'tbl1'), { timeout: 3000 })
      .toBeGreaterThan(baseline)

    // Add another — child count should keep growing.
    const after1 = await readGroupChildCount(page, 'tbl1')
    await page.locator('[data-testid="loop-add-column"]').click()
    await expect
      .poll(async () => readGroupChildCount(page, 'tbl1'), { timeout: 3000 })
      .toBeGreaterThan(after1)
  })

  test('removing a column via the right panel shrinks the canvas group child count', async ({
    page,
  }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()

    await selectField(page, 'tbl1')
    await expect(page.locator('[data-testid="loop-add-column"]')).toBeVisible()

    // Add one so we have 3 columns; then removing one yields a definite
    // shrink (vs. the seed which has 2 columns + the bgRect — removing
    // that column might bring the group back to a single rect with no
    // dividers, which is a valid but less obvious assertion).
    await page.locator('[data-testid="loop-add-column"]').click()
    await expect
      .poll(async () => readGroupChildCount(page, 'tbl1'), { timeout: 3000 })
      .toBeGreaterThan(0)
    const beforeRemove = await readGroupChildCount(page, 'tbl1')

    await page.locator('[data-testid="loop-remove-column-2"]').click()

    await expect
      .poll(async () => readGroupChildCount(page, 'tbl1'), { timeout: 3000 })
      .toBeLessThan(beforeRemove)
  })

  test('JSON preview pane reflects the new column key after Add Column', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await selectField(page, 'tbl1')

    // The seeded field is `required: true`, so the projection emits one
    // self-describing row carrying every column key (see
    // `jsonProjection.ts`). After Add Column the new key (`col3`) must
    // appear in the rendered preview.
    await page.locator('[data-testid="loop-add-column"]').click()

    await expect
      .poll(async () => (await page.locator('.tg-json-preview').textContent()) ?? '', {
        timeout: 3000,
      })
      .toMatch(/col3/)
  })

  test('Header style colour change reflects on the canvas', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await selectField(page, 'tbl1')
    await expect(page.locator('[data-testid="loop-add-column"]')).toBeVisible()

    // Read the colour of the first header-label Textbox before the edit.
    // The header labels are the children with a `.text` value matching one
    // of the column labels — A or B from the seed.
    const readHeaderFill = async (): Promise<string | null> => {
      return await page.evaluate((id: string) => {
        interface ChildLike {
          fill?: string | null
          text?: string | null
        }
        interface FabricLike {
          getObjects(): Array<{
            __fieldId?: string
            getObjects?: () => ChildLike[]
          }>
        }
        const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
        if (!fc) return null
        const g = fc.getObjects().find((o) => o.__fieldId === id)
        if (!g?.getObjects) return null
        const headerLabel = g.getObjects().find((c) => c.text === 'A')
        return headerLabel?.fill ?? null
      }, 'tbl1')
    }

    const before = await readHeaderFill()
    expect(before).not.toBeNull()

    // Drive the colour change directly through the templateStore so the
    // test doesn't depend on the visual layout of the right-panel
    // properties (the colour picker is a native `<input type="color">`,
    // tricky to operate from Playwright). The store update is exactly
    // what the user-facing handler does (`updateHeader({ color: '#ff0000' })`).
    await page.evaluate(() => {
      interface StoreLike {
        getState(): {
          fields: Array<{ id: string; type: string; style: { headerStyle: object } }>
          updateFieldStyle: (id: string, updates: object) => void
        }
      }
      const w = window as unknown as { __templateStore?: StoreLike }
      const store = w.__templateStore
      if (!store) throw new Error('templateStore not exposed; cannot drive headerStyle change')
      const f = store.getState().fields.find((x) => x.id === 'tbl1')
      if (!f) throw new Error('tbl1 not found')
      store.getState().updateFieldStyle('tbl1', {
        headerStyle: { ...f.style.headerStyle, color: '#ff0000' },
      })
    })

    await expect.poll(readHeaderFill, { timeout: 3000 }).toBe('#ff0000')
  })

  test('focusing a right-panel input auto-selects its full text', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await selectField(page, 'tbl1')
    await expect(page.locator('[data-testid="loop-add-column"]')).toBeVisible()

    // The seeded jsonKey is "rows" (4 chars). After focus + the deferred
    // select() inside `selectAllOnFocus`, the input's selectionStart
    // should be 0 and selectionEnd should match the value length.
    const keyInput = page.locator('[data-testid="loop-jsonkey-input"]')
    await expect(keyInput).toHaveValue('rows')
    await keyInput.focus()

    // Wait for the setTimeout(0) in selectAllOnFocus to run.
    await expect
      .poll(
        async () =>
          await keyInput.evaluate((el: HTMLInputElement) => ({
            start: el.selectionStart ?? -1,
            end: el.selectionEnd ?? -1,
            len: el.value.length,
          })),
        { timeout: 2000 },
      )
      .toMatchObject({ start: 0, end: 4, len: 4 })
  })
})
