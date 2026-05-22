/**
 * #61 follow-up — regression coverage for the band-lifecycle defects
 * surfaced during QA on `feature/61-page-header-footer`:
 *
 *   1. Header field group must stay ABOVE the band background rect, even
 *      after store mutations that re-run the Fabric reconciler (the
 *      "header content hides when I set backgroundColor" defect — z-order
 *      was inverted because `useFabricSync`'s ambient-count filter
 *      excluded `__isBand` while `useBandVisuals` paints below).
 *   2. Page-number Textbox must paint ABOVE its band's background rect.
 *   3. Toggling page-number ON must auto-enable its placement band — the
 *      core validator otherwise rejects with PAGE_NUMBER_PLACEMENT_INVALID
 *      at preview time.
 *   4. Switching `pageNumber.placement` must auto-enable the new target
 *      band (symmetric guarantee).
 *   5. Hide-band migrates band fields into body with absolute coords;
 *      show-band RECLAIMS body fields still sitting inside the band's
 *      Y-strip (the user never moved them) so the validator's
 *      FIELD_OVERLAPS_BAND check stays clean on re-show.
 *   6. End-to-end preview render must succeed when a band is disabled
 *      but its former Y-strip is now occupied by body fields (validator
 *      short-circuits on `!band.enabled`).
 *
 * Strategy: drive store mutations through `window.__templateStore` (exposed
 * in DEV) and assert on `window.__fabricCanvas` object order — the same
 * surface real bug reports use to inspect state. Avoids the PDF-blob popup
 * race in `preview-dialog.spec.ts` (Playwright/Chromium never fires
 * `domcontentloaded` on a PDF blob: URL, only `networkidle`).
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function clearStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('template-goblin-template')
    localStorage.removeItem('template-goblin-ui')
    try {
      indexedDB.deleteDatabase('template-goblin')
    } catch {
      /* ignore */
    }
  })
}

async function completeOnboarding(page: Page): Promise<void> {
  await page.locator('button', { hasText: /^Solid color$/ }).click()
  await page.locator('button', { hasText: /^Next →$/ }).click()
  await expect(page.getByRole('heading', { name: /choose page size/i })).toBeVisible({
    timeout: 5000,
  })
  await page
    .getByRole('button', { name: /^(Apply|Continue|Next|Done)$/i })
    .first()
    .click()
}

async function waitForCanvas(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()).toBeVisible({
    timeout: 10000,
  })
  await expect
    .poll(
      () =>
        page.evaluate(() => !!(window as unknown as { __fabricCanvas?: unknown }).__fabricCanvas),
      { timeout: 10000 },
    )
    .toBe(true)
}

/** Add a body text field with safe defaults for in-browser PDF rendering. */
async function seedBodyField(page: Page, id: string, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ id, x, y }: { id: string; x: number; y: number }) => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as { addField: (f: unknown) => void }
      s.addField({
        id,
        type: 'text',
        label: id,
        x,
        y,
        width: 200,
        height: 30,
        rotation: 0,
        pageId: null,
        groupId: null,
        zIndex: 0,
        source: { mode: 'dynamic', jsonKey: id, required: false, placeholder: id.toUpperCase() },
        style: {
          fontId: null,
          fontFamily: 'Helvetica',
          fontSize: 14,
          fontSizeMin: 8,
          color: '#000000',
          align: 'left',
          valign: 'top',
          verticalAlign: 'middle',
          lineHeight: 1.2,
          letterSpacing: 0,
          bold: false,
          italic: false,
          underline: false,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          maxRows: 1,
          overflowMode: 'truncate',
          snapToGrid: true,
          overflow: 'shrink',
        },
      })
    },
    { id, x, y },
  )
}

async function seedHeaderField(page: Page, id: string, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ id, x, y }: { id: string; x: number; y: number }) => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as {
        setHeaderEnabled: (v: boolean) => void
        addHeaderField: (f: unknown) => void
      }
      s.setHeaderEnabled(true)
      s.addHeaderField({
        id,
        type: 'text',
        label: id,
        x,
        y,
        width: 200,
        height: 24,
        rotation: 0,
        pageId: null,
        groupId: null,
        zIndex: 0,
        source: { mode: 'dynamic', jsonKey: id, required: false, placeholder: id.toUpperCase() },
        style: {
          fontId: null,
          fontFamily: 'Helvetica',
          fontSize: 14,
          fontSizeMin: 8,
          color: '#000000',
          align: 'left',
          valign: 'top',
          verticalAlign: 'middle',
          lineHeight: 1.2,
          letterSpacing: 0,
          bold: false,
          italic: false,
          underline: false,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          maxRows: 1,
          overflowMode: 'truncate',
          snapToGrid: true,
          overflow: 'shrink',
        },
      })
    },
    { id, x, y },
  )
}

interface CanvasZSnapshot {
  fieldIdxById: Record<string, number>
  bandRectIdxByFill: Record<string, number>
  pageNumberIdx: number | null
}

async function canvasZSnapshot(page: Page): Promise<CanvasZSnapshot> {
  return await page.evaluate(() => {
    interface O {
      __fieldId?: string
      __isBand?: boolean
      type?: string
      fill?: unknown
    }
    const fc = (window as unknown as { __fabricCanvas?: { getObjects(): O[] } }).__fabricCanvas
    if (!fc) return { fieldIdxById: {}, bandRectIdxByFill: {}, pageNumberIdx: null }
    const objs = fc.getObjects()
    const out: CanvasZSnapshot = { fieldIdxById: {}, bandRectIdxByFill: {}, pageNumberIdx: null }
    objs.forEach((o, idx) => {
      if (o.__fieldId) out.fieldIdxById[o.__fieldId] = idx
      if (o.__isBand && o.type === 'rect' && typeof o.fill === 'string')
        out.bandRectIdxByFill[o.fill] = idx
      if (o.__isBand && o.type === 'textbox') out.pageNumberIdx = idx
    })
    return out
  })
}

test.describe('#61 regressions — z-order, auto-enable, reclaim, disabled-band preview', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await completeOnboarding(page)
    await waitForCanvas(page)
  })

  test('header field group paints ABOVE the band background rect (regression: hidden content)', async ({
    page,
  }) => {
    await seedHeaderField(page, 'hdrTitle', 10, 8)
    await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as { setHeaderStyle: (p: unknown) => void }
      s.setHeaderStyle({ backgroundColor: '#ffd966' })
    })
    // Nudge the reconciler the way a real edit would (touches `pageFields`).
    await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as {
        updateHeaderField: (id: string, p: unknown) => void
      }
      s.updateHeaderField('hdrTitle', { x: 11 })
      s.updateHeaderField('hdrTitle', { x: 10 })
    })
    const snap = await canvasZSnapshot(page)
    expect(snap.fieldIdxById['hdrTitle']).toBeGreaterThan(snap.bandRectIdxByFill['#ffd966'])
  })

  test('page-number Textbox paints ABOVE the footer background rect', async ({ page }) => {
    await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as {
        setFooterEnabled: (v: boolean) => void
        setFooterStyle: (p: unknown) => void
        setPageNumber: (c: unknown) => void
      }
      s.setFooterEnabled(true)
      s.setFooterStyle({ backgroundColor: '#9fc5e8' })
      s.setPageNumber({
        enabled: true,
        placement: 'footer',
        align: 'center',
        color: '#000000',
        numeralStyle: 'arabic',
        fontFamily: 'Helvetica',
        fontSize: 10,
        showOnFirstPage: true,
      })
    })
    const snap = await canvasZSnapshot(page)
    expect(snap.pageNumberIdx).not.toBeNull()
    expect(snap.pageNumberIdx!).toBeGreaterThan(snap.bandRectIdxByFill['#9fc5e8'])
  })

  test('enabling page-number with footer placement auto-enables the footer band', async ({
    page,
  }) => {
    const before = await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      return !!(w.__templateStore.getState() as { footer?: { enabled: boolean } }).footer?.enabled
    })
    expect(before).toBe(false)

    await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as { setPageNumber: (c: unknown) => void }
      s.setPageNumber({
        enabled: true,
        placement: 'footer',
        align: 'center',
        color: '#000000',
        numeralStyle: 'arabic',
        fontFamily: 'Helvetica',
        fontSize: 10,
        showOnFirstPage: false,
      })
    })

    const after = await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      return !!(w.__templateStore.getState() as { footer?: { enabled: boolean } }).footer?.enabled
    })
    expect(after).toBe(true)
  })

  test('switching pageNumber.placement to header auto-enables the header band', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as { setPageNumber: (c: unknown) => void }
      s.setPageNumber({
        enabled: true,
        placement: 'footer',
        align: 'center',
        color: '#000000',
        numeralStyle: 'arabic',
        fontFamily: 'Helvetica',
        fontSize: 10,
        showOnFirstPage: false,
      })
    })

    const beforeHeader = await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      return !!(w.__templateStore.getState() as { header?: { enabled: boolean } }).header?.enabled
    })
    expect(beforeHeader).toBe(false)

    await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as { setPageNumberConfig: (p: unknown) => void }
      s.setPageNumberConfig({ placement: 'header' })
    })

    const afterHeader = await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      return !!(w.__templateStore.getState() as { header?: { enabled: boolean } }).header?.enabled
    })
    expect(afterHeader).toBe(true)
  })

  test('hide-band migrates fields to body; re-show reclaims fields inside band Y-range', async ({
    page,
  }) => {
    await seedHeaderField(page, 'hdrR', 10, 4)

    const beforeHide = await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as {
        header?: { fields?: unknown[] }
        fields: unknown[]
      }
      return { headerCount: s.header?.fields?.length ?? 0, bodyCount: s.fields.length }
    })
    expect(beforeHide).toEqual({ headerCount: 1, bodyCount: 0 })

    await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      ;(
        w.__templateStore.getState() as { setHeaderEnabled: (v: boolean) => void }
      ).setHeaderEnabled(false)
    })

    const afterHide = await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as {
        header?: { fields?: unknown[] }
        fields: unknown[]
      }
      return { headerCount: s.header?.fields?.length ?? 0, bodyCount: s.fields.length }
    })
    expect(afterHide).toEqual({ headerCount: 0, bodyCount: 1 })

    await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      ;(
        w.__templateStore.getState() as { setHeaderEnabled: (v: boolean) => void }
      ).setHeaderEnabled(true)
    })

    const afterShow = await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      const s = w.__templateStore.getState() as {
        header?: { fields?: Array<{ id: string; x: number; y: number }> }
        fields: unknown[]
      }
      return {
        headerCount: s.header?.fields?.length ?? 0,
        bodyCount: s.fields.length,
        reclaimedId: s.header?.fields?.[0]?.id ?? null,
      }
    })
    expect(afterShow).toEqual({ headerCount: 1, bodyCount: 0, reclaimedId: 'hdrR' })
  })

  test('preview render succeeds after hiding a band whose former Y-strip still contains body fields', async ({
    page,
  }) => {
    // Seed: body field + header field, then hide header. IDs are also
    // used as `jsonKey` by the seed helper, so they must satisfy the
    // validator's `/^[A-Za-z_][A-Za-z0-9_]*$/` rule (no hyphens).
    await seedBodyField(page, 'bodyGreeting', 80, 240)
    await seedHeaderField(page, 'hdrTitle', 10, 4)
    await page.evaluate(() => {
      const w = window as unknown as { __templateStore: { getState(): Record<string, unknown> } }
      ;(
        w.__templateStore.getState() as { setHeaderEnabled: (v: boolean) => void }
      ).setHeaderEnabled(false)
    })

    await page.locator('[data-testid="toolbar-preview"]').click()
    await expect(page.locator('[data-testid="preview-dialog"]')).toBeVisible()
    await page.locator('[data-testid="preview-render"]').click()

    // The regression we're guarding is `FIELD_OVERLAPS_BAND` surfacing in
    // the dialog's inline error region after Render. Wait a short moment
    // for the render to settle, then assert no error chip appeared. We
    // intentionally do NOT wait on the PDF popup — Playwright/Chromium
    // never fires `domcontentloaded` on PDF blob: URLs, and the popup is
    // unrelated to the validator regression under test.
    await page.waitForTimeout(800)
    await expect(page.locator('[data-testid="preview-render-error"]')).toHaveCount(0)
  })
})
