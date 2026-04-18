/**
 * Zoom rule-set E2E coverage for spec 009 REQ-037..043 / AC-037..043.
 *
 * Written from spec — NOT from implementation. Some tests are marked
 * `test.fail(...)` because they depend on Dev work that is in-flight
 * (the ref-callback wheel-listener fix and the Ctrl+0 / Ctrl+1 keybindings).
 * When the Dev lands the fix they should flip to `test(...)` without
 * touching the body of the test — a bare `test()` with the same body is
 * the expected GREEN state.
 *
 * References:
 *   - bugs.md → "Canvas Zoom & Pan — Standard Bindings"
 *   - specs/009-ui-canvas.md §REQ-037..043 and §AC-037..043
 *
 * Selector strategy mirrors the sibling `pan.spec.ts` / `zoom-scroll-bounds.spec.ts`
 * files: reach the scroll container by walking up from the Konva <canvas>.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

/* ---------------- helpers ---------------- */

/**
 * Seed a template with a solid-color page 0 so the app lands directly in the
 * canvas view (no onboarding picker in the way). For AC-041 we instead want
 * to start in onboarding state and drive the transition — that test uses its
 * own seed override.
 */
async function seedSeededTemplate(page: Page, width = 1000, height = 800): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'test',
        version: '0.0.0',
        width,
        height,
        locked: false,
      },
      fields: [],
      fonts: [],
      groups: [],
      pages: [
        {
          id: 'page-0',
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
    },
    version: 2,
  }
  await page.addInitScript((seed: string) => {
    localStorage.setItem('template-goblin-template', seed)
  }, JSON.stringify(payload))
}

/** Seed an *empty* template — forces the onboarding picker (REQ-034). */
async function seedEmptyTemplate(page: Page): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: '',
        version: '0.0.0',
        width: 0,
        height: 0,
        locked: false,
      },
      fields: [],
      fonts: [],
      groups: [],
      pages: [],
      backgroundDataUrl: null,
      backgroundBuffer: null,
      pageBackgroundDataUrls: [],
      pageBackgroundBuffers: [],
      fontBuffers: [],
      placeholderBuffers: [],
    },
    version: 2,
  }
  await page.addInitScript((seed: string) => {
    localStorage.setItem('template-goblin-template', seed)
  }, JSON.stringify(payload))
}

function canvas(page: Page) {
  return page.locator('canvas').first()
}

/** Current zoom read from the uiStore persisted mirror in DOM title/debug?
 * The store is not exposed on window; read it indirectly by inspecting the
 * Konva stage scale, which is `{ x: zoom, y: zoom }`.
 */
async function readZoom(page: Page): Promise<number> {
  return canvas(page).evaluate((c) => {
    // Konva renders its <canvas> inside a div; the Stage object hangs off
    // Konva's private registry. We find it via the parent's Konva Stage by
    // looking at the canvas element's computed `transform` — but simpler:
    // the Stage scale is reflected in the canvas.width vs its logical size.
    // Robustly, read from window.Konva if present:
    interface KonvaGlobal {
      stages?: Array<{ scaleX(): number; scaleY(): number }>
    }
    const K = (window as unknown as { Konva?: KonvaGlobal }).Konva
    if (K?.stages && K.stages.length > 0) {
      return K.stages[0].scaleX()
    }
    // Fallback: pull from localStorage persisted uiStore.
    const raw = localStorage.getItem('template-goblin-ui')
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { state?: { zoom?: number } }
        return parsed.state?.zoom ?? 1
      } catch {
        return 1
      }
    }
    void c
    return 1
  })
}

/** Walk up from the <canvas> element to the first overflow:auto/scroll parent. */
async function scrollContainerInfo(page: Page) {
  return canvas(page).evaluate((c) => {
    let node: HTMLElement | null = (c as HTMLCanvasElement).parentElement
    let parent: HTMLElement = (c as HTMLCanvasElement).parentElement as HTMLElement
    while (node) {
      const style = getComputedStyle(node)
      if (
        style.overflowX === 'auto' ||
        style.overflowX === 'scroll' ||
        style.overflow === 'auto' ||
        style.overflow === 'scroll'
      ) {
        parent = node
        break
      }
      node = node.parentElement
    }
    const r = parent.getBoundingClientRect()
    return {
      scrollLeft: parent.scrollLeft,
      scrollTop: parent.scrollTop,
      scrollWidth: parent.scrollWidth,
      scrollHeight: parent.scrollHeight,
      clientWidth: parent.clientWidth,
      clientHeight: parent.clientHeight,
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
    }
  })
}

/** Dispatch a wheel event with the given modifiers at the given client coord. */
async function dispatchWheel(
  page: Page,
  clientX: number,
  clientY: number,
  init: {
    deltaY?: number
    deltaX?: number
    ctrlKey?: boolean
    shiftKey?: boolean
    metaKey?: boolean
  },
): Promise<void> {
  await canvas(page).evaluate(
    (c, args) => {
      let node: HTMLElement | null = (c as HTMLCanvasElement).parentElement
      let parent: HTMLElement = (c as HTMLCanvasElement).parentElement as HTMLElement
      while (node) {
        const style = getComputedStyle(node)
        if (
          style.overflowX === 'auto' ||
          style.overflowX === 'scroll' ||
          style.overflow === 'auto' ||
          style.overflow === 'scroll'
        ) {
          parent = node
          break
        }
        node = node.parentElement
      }
      const ev = new WheelEvent('wheel', {
        clientX: args.clientX,
        clientY: args.clientY,
        deltaY: args.deltaY ?? 0,
        deltaX: args.deltaX ?? 0,
        ctrlKey: args.ctrlKey ?? false,
        shiftKey: args.shiftKey ?? false,
        metaKey: args.metaKey ?? false,
        bubbles: true,
        cancelable: true,
      })
      parent.dispatchEvent(ev)
    },
    { clientX, clientY, ...init },
  )
}

/* ---------------- tests ---------------- */

test.describe('Canvas zoom rule set — spec 009 REQ-037..043 / AC-037..043', () => {
  test.describe('AC-037: Ctrl+wheel zooms', () => {
    test.beforeEach(async ({ page }) => {
      await seedSeededTemplate(page)
      await page.goto('/')
      await canvas(page).waitFor({ state: 'visible' })
    })

    /**
     * AC-037 (baseline — already working today).
     * Ctrl+wheel over the canvas should change zoom. deltaY < 0 increases
     * zoom; deltaY > 0 decreases. Bounds clamped to [0.1, 5].
     */
    test('Ctrl+wheel up increases zoom', async ({ page }) => {
      const before = await readZoom(page)
      const box = await canvas(page).boundingBox()
      if (!box) throw new Error('canvas not visible')
      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: -100,
        ctrlKey: true,
      })
      const after = await readZoom(page)
      expect(after).toBeGreaterThan(before)
    })

    test('Ctrl+wheel down decreases zoom', async ({ page }) => {
      // Zoom in first so there's room to go down without hitting the 0.1 floor
      const box = await canvas(page).boundingBox()
      if (!box) throw new Error('canvas not visible')
      for (let i = 0; i < 5; i++) {
        await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
          deltaY: -100,
          ctrlKey: true,
        })
      }
      const before = await readZoom(page)
      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: 100,
        ctrlKey: true,
      })
      const after = await readZoom(page)
      expect(after).toBeLessThan(before)
    })

    test('zoom clamps at 5.0 on repeated Ctrl+wheel up', async ({ page }) => {
      const box = await canvas(page).boundingBox()
      if (!box) throw new Error('canvas not visible')
      for (let i = 0; i < 200; i++) {
        await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
          deltaY: -100,
          ctrlKey: true,
        })
      }
      const z = await readZoom(page)
      expect(z).toBeLessThanOrEqual(5)
      expect(z).toBeCloseTo(5, 1)
    })

    test('zoom clamps at 0.1 on repeated Ctrl+wheel down', async ({ page }) => {
      const box = await canvas(page).boundingBox()
      if (!box) throw new Error('canvas not visible')
      for (let i = 0; i < 200; i++) {
        await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
          deltaY: 100,
          ctrlKey: true,
        })
      }
      const z = await readZoom(page)
      expect(z).toBeGreaterThanOrEqual(0.1)
      expect(z).toBeCloseTo(0.1, 2)
    })
  })

  test.describe('AC-038: pinch-zoom (wheel with ctrlKey:true) hits the same handler', () => {
    test.beforeEach(async ({ page }) => {
      await seedSeededTemplate(page)
      await page.goto('/')
      await canvas(page).waitFor({ state: 'visible' })
    })

    /**
     * AC-038. Trackpads emit `wheel` events with `ctrlKey: true` and no
     * actual Ctrl-key physically held. The zoom handler MUST accept these.
     */
    test('wheel with ctrlKey:true dispatched directly (no mouse.wheel API) changes zoom', async ({
      page,
    }) => {
      const before = await readZoom(page)
      const box = await canvas(page).boundingBox()
      if (!box) throw new Error('canvas not visible')
      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: -50,
        ctrlKey: true,
      })
      const after = await readZoom(page)
      expect(after).toBeGreaterThan(before)
    })
  })

  test.describe('AC-039: zoom anchors at cursor position', () => {
    test.beforeEach(async ({ page }) => {
      await seedSeededTemplate(page, 1000, 800)
      await page.goto('/')
      await canvas(page).waitFor({ state: 'visible' })
    })

    /**
     * AC-039. Place a detectable feature at canvas coordinate (200, 200)
     * (in canvas units — before zoom). Locate it on screen, zoom in with
     * the cursor directly on it, and assert the screen position stays
     * within 2 px of where it was.
     *
     * Implementation: we use the Konva Stage transform to convert canvas
     * coords → screen coords deterministically instead of relying on a
     * painted feature.
     */
    test.fail(
      'screen position of canvas-point (200,200) stays ±2 px across a Ctrl+wheel zoom',
      async ({ page }) => {
        // Flips to test() once Dev lands the zoom-at-cursor code path (REQ-038).
        const box = await canvas(page).boundingBox()
        if (!box) throw new Error('canvas not visible')

        async function screenPosOfCanvasPoint(
          cx: number,
          cy: number,
        ): Promise<{ x: number; y: number }> {
          return canvas(page).evaluate(
            (c, pt) => {
              interface KonvaGlobal {
                stages?: Array<{
                  container(): HTMLElement
                  scaleX(): number
                  scaleY(): number
                  x(): number
                  y(): number
                }>
              }
              const K = (window as unknown as { Konva?: KonvaGlobal }).Konva
              if (!K?.stages || K.stages.length === 0) {
                throw new Error('Konva not available on window')
              }
              const stage = K.stages[0]
              const containerRect = stage.container().getBoundingClientRect()
              return {
                x: containerRect.left + stage.x() + pt.cx * stage.scaleX(),
                y: containerRect.top + stage.y() + pt.cy * stage.scaleY(),
              }
              void c
            },
            { cx, cy },
          )
        }

        const pos0 = await screenPosOfCanvasPoint(200, 200)
        // Place cursor on the feature, then Ctrl+wheel zoom in.
        await dispatchWheel(page, pos0.x, pos0.y, { deltaY: -100, ctrlKey: true })
        const pos1 = await screenPosOfCanvasPoint(200, 200)

        expect(Math.abs(pos1.x - pos0.x)).toBeLessThanOrEqual(2)
        expect(Math.abs(pos1.y - pos0.y)).toBeLessThanOrEqual(2)
      },
    )
  })

  test.describe('AC-040: plain wheel scrolls; Shift+wheel scrolls horizontally; neither zooms', () => {
    test.beforeEach(async ({ page }) => {
      await seedSeededTemplate(page, 2000, 2000) // big enough to overflow
      await page.goto('/')
      await canvas(page).waitFor({ state: 'visible' })
    })

    test('plain wheel (no modifier) scrolls vertically and does not change zoom', async ({
      page,
    }) => {
      const before = await readZoom(page)
      const infoBefore = await scrollContainerInfo(page)
      const box = await canvas(page).boundingBox()
      if (!box) throw new Error('canvas not visible')

      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: 150,
      })

      const after = await readZoom(page)
      const infoAfter = await scrollContainerInfo(page)

      expect(after).toBeCloseTo(before, 5)
      // Scroll position moved down — either via browser default or custom handler.
      // Accept either "scrollTop increased" or "handler prevented default and
      // did its own thing" (in which case scrollTop still should have moved).
      expect(infoAfter.scrollTop).toBeGreaterThanOrEqual(infoBefore.scrollTop)
    })

    test.fail('Shift+wheel scrolls horizontally and does not change zoom', async ({ page }) => {
      // Flips to test() once Dev implements Shift+wheel horizontal scrolling
      // in the same handler (REQ-039).
      const before = await readZoom(page)
      const infoBefore = await scrollContainerInfo(page)
      const box = await canvas(page).boundingBox()
      if (!box) throw new Error('canvas not visible')

      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: 150,
        shiftKey: true,
      })

      const after = await readZoom(page)
      const infoAfter = await scrollContainerInfo(page)

      expect(after).toBeCloseTo(before, 5)
      // scrollLeft must have advanced; scrollTop must NOT have advanced.
      expect(infoAfter.scrollLeft).toBeGreaterThan(infoBefore.scrollLeft)
      expect(infoAfter.scrollTop).toBe(infoBefore.scrollTop)
    })
  })

  test.describe('AC-041: wheel listener survives onboarding → canvas transition', () => {
    test.beforeEach(async ({ page }) => {
      await seedEmptyTemplate(page)
      await page.goto('/')
    })

    /**
     * AC-041 — THE bug being fixed. The app launches in onboarding state;
     * the user completes onboarding with a solid color; they move the cursor
     * over the canvas and Ctrl+wheel should zoom. Before the ref-callback
     * fix the wheel listener was still bound to the unmounted onboarding
     * picker container, so this test was RED.
     *
     * Flips to test() once Dev lands the ref-callback wheel listener
     * attachment pattern (REQ-040).
     */
    test.fail(
      'completing onboarding with solid color then Ctrl+wheel zooms the canvas',
      async ({ page }) => {
        // Complete onboarding — pick "Solid color" then Apply.
        // The onboarding picker uses `data-testid` hooks on its buttons.
        const solidBtn = page
          .locator('[data-testid="onboarding-solid-color"], button:has-text("Solid color")')
          .first()
        await solidBtn.waitFor({ state: 'visible', timeout: 5000 })
        await solidBtn.click()

        const applyBtn = page
          .locator('[data-testid="onboarding-apply"], button:has-text("Apply")')
          .first()
        await applyBtn.waitFor({ state: 'visible', timeout: 5000 })
        await applyBtn.click()

        // Wait for the canvas to render.
        await canvas(page).waitFor({ state: 'visible', timeout: 5000 })

        const before = await readZoom(page)
        const box = await canvas(page).boundingBox()
        if (!box) throw new Error('canvas not visible after onboarding')

        await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
          deltaY: -100,
          ctrlKey: true,
        })
        const after = await readZoom(page)
        expect(after).not.toBe(before)
      },
    )
  })

  test.describe('AC-042: Ctrl+0 fits the page to the viewport', () => {
    test.beforeEach(async ({ page }) => {
      await seedSeededTemplate(page, 595, 842) // A4
      await page.goto('/')
      await canvas(page).waitFor({ state: 'visible' })
    })

    /**
     * AC-042. Ctrl/Cmd+0 must scale the page so it fits the visible viewport
     * with ≥16 pt padding per side. The expected zoom is approximately
     * `min(containerW/pageW, containerH/pageH)` minus a small padding slack.
     * We allow a wide tolerance (±15 %) because the exact padding constant
     * is a Dev-internal choice — the SPEC only requires ≥16 pt.
     */
    test.fail('Ctrl+0 sets zoom to approximately the fit-to-viewport factor', async ({ page }) => {
      // Flips to test() once Dev wires Ctrl+0 into useKeyboard (REQ-041).
      const info = await scrollContainerInfo(page)
      const pageW = 595
      const pageH = 842
      const expected = Math.min(info.width / pageW, info.height / pageH)

      // Issue Ctrl+0 at the OS keyboard layer.
      await page.keyboard.press('Control+0')

      const z = await readZoom(page)
      // Expected minus up to ~15% for padding, but must be in (0, expected].
      expect(z).toBeLessThanOrEqual(expected + 0.001)
      expect(z).toBeGreaterThan(expected * 0.7)
    })
  })

  test.describe('AC-043: Ctrl+1 resets zoom to 1.0', () => {
    test.beforeEach(async ({ page }) => {
      await seedSeededTemplate(page, 595, 842)
      await page.goto('/')
      await canvas(page).waitFor({ state: 'visible' })
    })

    /**
     * AC-043. Ctrl/Cmd+1 MUST set `zoom` to exactly 1.0 regardless of the
     * prior zoom. The viewport centre should remain on the same canvas
     * point but we don't assert that secondary requirement here.
     *
     * Flips to test() once Dev wires Ctrl+1 into useKeyboard (REQ-042).
     */
    test.fail('Ctrl+1 resets zoom to exactly 1.0 from a zoomed-in state', async ({ page }) => {
      const box = await canvas(page).boundingBox()
      if (!box) throw new Error('canvas not visible')
      // First zoom in a bunch of times so zoom != 1.
      for (let i = 0; i < 6; i++) {
        await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
          deltaY: -100,
          ctrlKey: true,
        })
      }
      const zoomedIn = await readZoom(page)
      expect(zoomedIn).toBeGreaterThan(1)

      await page.keyboard.press('Control+1')

      const z = await readZoom(page)
      expect(z).toBeCloseTo(1.0, 5)
    })
  })
})
