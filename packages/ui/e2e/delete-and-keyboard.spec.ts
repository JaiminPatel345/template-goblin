/**
 * E2E coverage for keyboard-driven field deletion.
 *
 * Pressing Delete (or Backspace) when one or more fields are selected should
 * remove them from the templateStore.fields[] AND from the canvas.
 *
 * Wired in `useCanvasKeyboard.ts`.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

interface SeedField {
  id: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

const TEXT_STYLE = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontSizeDynamic: false,
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

function fieldPayload(s: SeedField): Record<string, unknown> {
  return {
    id: s.id,
    type: 'text',
    label: s.id,
    groupId: null,
    pageId: null,
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
    zIndex: s.zIndex,
    source: { mode: 'dynamic', jsonKey: s.id, required: false, placeholder: null },
    style: TEXT_STYLE,
  }
}

async function seed(page: Page, fields: SeedField[]): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'delete-test',
        version: '0.0.0',
        width: 1000,
        height: 800,
        locked: false,
      },
      fields: fields.map(fieldPayload),
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
      staticImageBuffers: [],
      staticImageDataUrls: [],
    },
    version: 2,
  }
  await page.addInitScript((s: string) => {
    localStorage.setItem('template-goblin-template', s)
  }, JSON.stringify(payload))
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

async function readFieldIds(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const raw = localStorage.getItem('template-goblin-template')
    if (!raw) return []
    const parsed = JSON.parse(raw) as { state?: { fields?: Array<{ id: string }> } }
    return (parsed.state?.fields ?? []).map((f) => f.id)
  })
}

async function selectByLeftPanel(page: Page, id: string): Promise<void> {
  const row = page.locator('.tg-field-item-key', { hasText: `.${id}` })
  await row.first().click()
  // Confirm Fabric registered the selection.
  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          interface FabricLike {
            getActiveObjects(): Array<{ __fieldId?: string }>
          }
          const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
          return (fc?.getActiveObjects() ?? []).map((o) => o.__fieldId).filter(Boolean) as string[]
        }),
      { timeout: 2000 },
    )
    .toContain(id)
}

const FIELDS: SeedField[] = [
  { id: 'a', x: 100, y: 100, width: 200, height: 80, zIndex: 0 },
  { id: 'b', x: 100, y: 250, width: 200, height: 80, zIndex: 1 },
  { id: 'c', x: 100, y: 400, width: 200, height: 80, zIndex: 2 },
]

test.describe('Keyboard: delete selected field', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, FIELDS)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
  })

  test('Delete key removes the single selected field from the store', async ({ page }) => {
    await selectByLeftPanel(page, 'b')
    await page.keyboard.press('Delete')
    await expect.poll(async () => await readFieldIds(page), { timeout: 2000 }).toEqual(['a', 'c'])
  })

  test('Backspace also deletes (Mac convention)', async ({ page }) => {
    await selectByLeftPanel(page, 'a')
    await page.keyboard.press('Backspace')
    await expect.poll(async () => await readFieldIds(page), { timeout: 2000 }).toEqual(['b', 'c'])
  })

  test('Delete does NOT fire while focus is in an input/textarea', async ({ page }) => {
    await selectByLeftPanel(page, 'b')
    // Inject a temporary text input, focus it, then press Delete. The keyboard
    // hook reads `event.target.tagName` and skips removal when the user is
    // typing — this proves that guard is wired without depending on which
    // right-panel input happens to be visible for the selected field.
    await page.evaluate(() => {
      const inp = document.createElement('input')
      inp.type = 'text'
      inp.id = '__typing_probe'
      document.body.appendChild(inp)
      inp.focus()
    })
    await page.keyboard.press('Delete')
    // Field still present — guard worked.
    await expect
      .poll(async () => await readFieldIds(page), { timeout: 1500 })
      .toEqual(['a', 'b', 'c'])
  })
})
