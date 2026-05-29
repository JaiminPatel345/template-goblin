/**
 * Regression: clicking a solid-colour image field (#81) must NOT repaint
 * its bgRect with the selection emphasis fill — the user's chosen colour
 * IS the field's content, swapping it for the selection tint visually
 * corrupts the document on every click.
 *
 * The fix tags the bgRect with `__userControlledFill = true` in
 * `buildGroupChildren` whenever the image source carries a `{ color }`
 * value; `applySelectionVisuals` then keeps the fill on select and
 * emphasises through stroke only — same behaviour transparent-fill
 * fields already enjoyed.
 *
 * Discovered during #172 (rotation) live testing; fixed in the same PR.
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

async function seedSolidImage(page: Page, color: string): Promise<void> {
  await page.evaluate((c) => {
    type W = Window & {
      __templateStore?: { getState: () => { addField: (f: unknown) => void } }
    }
    const api = (window as W).__templateStore!.getState()
    api.addField({
      id: 'f-solid',
      type: 'image',
      x: 60,
      y: 60,
      width: 120,
      height: 120,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: { color: c } },
      style: { fit: 'contain' },
    })
  }, color)
}

test.describe('solid-colour image field — fill stable across selection', () => {
  test('selecting a solid-colour image keeps its bgRect fill (emphasis via stroke only)', async ({
    page,
  }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
    await seedSolidImage(page, '#ff0066')

    const phases = await page.evaluate(async () => {
      type Bg = { fill?: string; stroke?: string; __defaultFill?: string }
      type Grp = { __fieldId?: string; getObjects: () => Bg[] }
      type W = Window & {
        __fabricCanvas?: { getObjects: () => Grp[] }
        __uiStore?: { getState: () => { selectFields: (ids: string[]) => void } }
      }
      const w = window as W
      const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
      function snap(): { fill?: string; stroke?: string; defaultFill?: string } {
        const grp = w.__fabricCanvas!.getObjects().find((o) => o.__fieldId === 'f-solid')
        const bg = grp?.getObjects()[0]
        return { fill: bg?.fill, stroke: bg?.stroke, defaultFill: bg?.__defaultFill }
      }
      await wait(60)
      const initial = snap()
      w.__uiStore!.getState().selectFields(['f-solid'])
      await wait(120)
      const selected = snap()
      w.__uiStore!.getState().selectFields([])
      await wait(120)
      const deselected = snap()
      return { initial, selected, deselected }
    })

    // BUG: pre-fix, `selected.fill` would be `rgba(74, 222, 128, 0.4)`
    // (the image type's selectedFill token). Pins the regression.
    expect(phases.initial.fill).toBe('#ff0066')
    expect(phases.selected.fill).toBe('#ff0066')
    expect(phases.deselected.fill).toBe('#ff0066')

    // Stroke colour DOES change to convey selection — that's the
    // emphasis vehicle for user-controlled-fill fields.
    expect(phases.selected.stroke).not.toBe(phases.deselected.stroke)
  })

  test('regular text field still gets the selection-emphasis fill (no regression)', async ({
    page,
  }) => {
    // Sanity check: the fix narrows to user-controlled-fill bgRects; it
    // must NOT remove the emphasis fill for the normal text / image-
    // without-color cases.
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
    await page.evaluate(() => {
      type W = Window & {
        __templateStore?: { getState: () => { addField: (f: unknown) => void } }
      }
      ;(window as W).__templateStore!.getState().addField({
        id: 'f-dyn',
        type: 'text',
        x: 60,
        y: 60,
        width: 120,
        height: 40,
        zIndex: 0,
        pageId: null,
        groupId: null,
        source: { mode: 'dynamic', jsonKey: 'name', required: false, placeholder: null },
        style: {},
      })
    })

    const phases = await page.evaluate(async () => {
      type Bg = { fill?: string }
      type Grp = { __fieldId?: string; getObjects: () => Bg[] }
      type W = Window & {
        __fabricCanvas?: { getObjects: () => Grp[] }
        __uiStore?: { getState: () => { selectFields: (ids: string[]) => void } }
      }
      const w = window as W
      const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
      function fill(): string | undefined {
        return w
          .__fabricCanvas!.getObjects()
          .find((o) => o.__fieldId === 'f-dyn')
          ?.getObjects()[0]?.fill
      }
      await wait(60)
      const initial = fill()
      w.__uiStore!.getState().selectFields(['f-dyn'])
      await wait(120)
      const selected = fill()
      return { initial, selected }
    })

    // Dynamic text gets its design-time tint as default fill, swapped
    // for the selectedFill token on click. The fix MUST NOT have broken
    // this — the two values must differ.
    expect(phases.selected).not.toBe(phases.initial)
  })
})
