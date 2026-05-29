/**
 * #109 — Marquee (drag-from-empty-area) selection mirrors Canva /
 * Figma / PowerPoint / Google Slides semantics:
 *
 *   1. Only fields whose entire bounding rect lies inside the marquee
 *      are selected. Partial intersection → NOT selected.
 *   2. Fields don't visually displace during or after the marquee —
 *      Fabric's per-object `left` / `top` values stay untouched.
 *
 * Driven by dispatching real `mousedown` / `mousemove` / `mouseup`
 * events on Fabric's upper-canvas element so the test exercises the
 * actual Fabric selection path, not a synthesised store call.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

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

async function onboardSolidColor(page: Page): Promise<void> {
  await page.locator('[data-testid="onboarding-solid-color"]').click()
  await page.getByRole('button', { name: /Next/i }).click()
  await page.getByRole('button', { name: /Apply/i }).click()
}

async function seedFields(page: Page): Promise<void> {
  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: { getState: () => { addField: (f: unknown) => void } }
    }
    const w = window as W
    const api = w.__templateStore!.getState()
    // 'inside' fully inside the planned marquee (50,50) → (300,300).
    api.addField({
      id: 'f-inside',
      type: 'text',
      x: 80,
      y: 80,
      width: 100,
      height: 30,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'inside' },
      style: {},
    })
    // 'partial' straddles the right edge of the marquee.
    api.addField({
      id: 'f-partial',
      type: 'text',
      x: 270,
      y: 100,
      width: 80,
      height: 30,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'partial' },
      style: {},
    })
    // 'outside' fully outside.
    api.addField({
      id: 'f-outside',
      type: 'text',
      x: 400,
      y: 400,
      width: 80,
      height: 30,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'outside' },
      style: {},
    })
  })
}

test.describe('#109 — marquee selection mirrors Canva semantics', () => {
  test('Fabric canvas is configured with selectionFullyContained = true', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

    const flag = await page.evaluate(() => {
      type W = Window & { __fabricCanvas?: { selectionFullyContained?: boolean } }
      const w = window as W
      return w.__fabricCanvas?.selectionFullyContained ?? null
    })
    expect(flag).toBe(true)
  })

  test('real Fabric marquee drag selects only fully-contained fields, no visual displacement', async ({
    page,
  }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
    await seedFields(page)

    // Drive the marquee through real DOM mouse events on Fabric's
    // upper-canvas element. Captures Fabric object positions before,
    // mid-drag, and after the mouseup so we can prove neither phase
    // displaces them.
    const result = await page.evaluate(async () => {
      type FabObj = { __fieldId?: string; left?: number; top?: number }
      type FabricCanvasLike = {
        upperCanvasEl: HTMLCanvasElement
        getObjects: () => FabObj[]
      }
      type W = Window & {
        __fabricCanvas?: FabricCanvasLike
        __uiStore?: { getState: () => { selectedFieldIds: string[] } }
      }
      const w = window as W
      const fc = w.__fabricCanvas!
      const el = fc.upperCanvasEl
      const r = el.getBoundingClientRect()
      // Marquee at page (50,50) → (300,300) — fully wraps f-inside
      // (80,80,100x30), straddles f-partial's right edge (270 → 350),
      // misses f-outside entirely (400+).
      const start = { x: r.x + 50, y: r.y + 50 }
      const end = { x: r.x + 300, y: r.y + 300 }

      function snap(): Array<{ id: string; left: number; top: number }> {
        return fc
          .getObjects()
          .filter((o) => typeof o.__fieldId === 'string')
          .map((o) => ({
            id: o.__fieldId as string,
            left: o.left ?? 0,
            top: o.top ?? 0,
          }))
      }
      const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

      const before = snap()
      el.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: start.x,
          clientY: start.y,
          button: 0,
        }),
      )
      await wait(40)
      el.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: end.x,
          clientY: end.y,
          button: 0,
        }),
      )
      await wait(40)
      const during = snap()
      el.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          clientX: end.x,
          clientY: end.y,
          button: 0,
        }),
      )
      await wait(80)
      const after = snap()
      const selectedIds = w.__uiStore!.getState().selectedFieldIds

      function delta(
        a: Array<{ id: string; left: number; top: number }>,
        b: Array<{ id: string; left: number; top: number }>,
      ): string[] {
        const out: string[] = []
        for (let i = 0; i < a.length; i++) {
          const x = a[i]
          const y = b[i]
          if (!x || !y) continue
          if (Math.abs(x.left - y.left) > 0.5 || Math.abs(x.top - y.top) > 0.5) {
            out.push(x.id)
          }
        }
        return out
      }
      return {
        movedDuring: delta(before, during),
        movedAfter: delta(before, after),
        selectedIds,
      }
    })

    // No visual displacement at any phase of the drag.
    expect(result.movedDuring).toEqual([])
    expect(result.movedAfter).toEqual([])

    // Only the fully-contained field is selected — partial + outside
    // are rejected.
    expect(result.selectedIds).toEqual(['f-inside'])
  })

  test('marquee that straddles a field edge does NOT select it (partial → rejected)', async ({
    page,
  }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
    await seedFields(page)

    // Marquee from (200,50) → (320,300) only touches f-partial's left
    // half (f-partial starts at x=270 with width=80, so it spans
    // 270→350). The marquee ends at x=320, so f-partial is partially
    // overlapped on the right edge — should NOT be selected.
    const result = await page.evaluate(async () => {
      type FabricCanvasLike = { upperCanvasEl: HTMLCanvasElement }
      type W = Window & {
        __fabricCanvas?: FabricCanvasLike
        __uiStore?: { getState: () => { selectedFieldIds: string[] } }
      }
      const w = window as W
      const el = w.__fabricCanvas!.upperCanvasEl
      const r = el.getBoundingClientRect()
      const start = { x: r.x + 200, y: r.y + 50 }
      const end = { x: r.x + 320, y: r.y + 300 }
      const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
      el.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: start.x,
          clientY: start.y,
          button: 0,
        }),
      )
      await wait(40)
      el.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: end.x,
          clientY: end.y,
          button: 0,
        }),
      )
      await wait(40)
      el.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          clientX: end.x,
          clientY: end.y,
          button: 0,
        }),
      )
      await wait(80)
      return { selectedIds: w.__uiStore!.getState().selectedFieldIds }
    })
    expect(result.selectedIds).not.toContain('f-partial')
  })
})
