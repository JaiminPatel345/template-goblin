import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function seedTemplateWithTextField(page: Page): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'trim-test',
        version: '0.0.0',
        width: 1000,
        height: 800,
        locked: false,
      },
      fields: [
        {
          id: 'tf-trim-1',
          type: 'text',
          groupId: null,
          pageId: 'page-0',
          label: 'Spaced Text',
          source: { mode: 'static', value: '   Hello World   ' },
          x: 100,
          y: 100,
          width: 200,
          height: 50,
          zIndex: 0,
          style: {
            fontId: null,
            fontFamily: 'Helvetica',
            fontSize: 14,
            fontSizeMin: 10,
            lineHeight: 1.2,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: '#000000',
            align: 'left',
            verticalAlign: 'top',
            maxRows: 3,
            overflowMode: 'truncate',
            snapToGrid: true,
            trim: true,
          },
        },
      ],
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

test.describe('Text field trim whitespace option (issue #20)', () => {
  test('exposes trim whitespace checkbox in right panel and field creation popup', async ({
    page,
  }) => {
    await seedTemplateWithTextField(page)
    await page.goto('/')

    // Click field in left panel field list to select it
    await page.locator('[data-testid="field-item-tf-trim-1"]').click()

    // Right panel should expose the Trim whitespace checkbox
    const trimCheckbox = page.locator('[data-testid="text-trim-whitespace"]')
    await expect(trimCheckbox).toBeVisible()
    await expect(trimCheckbox).toBeChecked()

    // Uncheck Trim whitespace
    await trimCheckbox.uncheck()
    await expect(trimCheckbox).not.toBeChecked()

    // Re-check Trim whitespace
    await trimCheckbox.check()
    await expect(trimCheckbox).toBeChecked()
  })
})
