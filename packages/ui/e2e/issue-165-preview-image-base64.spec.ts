/**
 * #165 — Regression test for placeholder bitmap → truncated base64 in
 * the JSON Preview.
 *
 * Seeds a dynamic image field with a placeholder bitmap stored in the
 * UI store. After mount the right-panel JSON Preview textarea must
 * contain the field's jsonKey under `images.<key>` with a value that
 * starts with `data:image/` (i.e. the truncated base64 head, not the
 * bare filename).
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

// A 1×1 transparent PNG (8 bytes of pixel data) — enough to be a valid
// PNG that buildImageDataUrlMap can convert.
const ONE_PX_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0xfc, 0xcf, 0xc0, 0x50,
  0x0f, 0x00, 0x05, 0x01, 0x01, 0x02, 0x97, 0xe9, 0xc4, 0xa7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
])

test('#165: JSON Preview shows truncated base64 for dynamic image with placeholder bitmap', async ({
  page,
}) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Open the right panel + seed a dynamic image field with a
  // placeholder bitmap in the store. Buffer + filename pair so
  // `buildImageDataUrlMap` can render it as `data:image/png;base64,…`.
  await page.evaluate((bytes) => {
    type W = Window & {
      __templateStore?: {
        getState: () => {
          addField: (f: unknown) => void
          addPlaceholder: (filename: string, buffer: ArrayBuffer) => void
        }
      }
      __uiStore?: { getState: () => { setShowRightPanel: (b: boolean) => void } }
    }
    const w = window as W
    w.__uiStore?.getState().setShowRightPanel(true)

    const buffer = new Uint8Array(bytes).buffer
    w.__templateStore!.getState().addPlaceholder('placeholders/student_photo.png', buffer)
    w.__templateStore!.getState().addField({
      id: 'field-165-photo',
      type: 'image',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: {
        mode: 'dynamic',
        jsonKey: 'student_photo',
        required: false,
        placeholder: { filename: 'placeholders/student_photo.png' },
      },
      style: { fit: 'contain' },
    })
  }, Array.from(ONE_PX_PNG_BYTES))

  // The JSON Preview textarea should now contain
  // images.student_photo with a value starting with data:image/ and
  // ending in the placeholder sentinel '...<placeholder>'.
  const textarea = page.locator('[data-testid="json-preview-textarea"]')
  await expect(textarea).toBeVisible({ timeout: 5000 })
  const text = await textarea.inputValue().catch(async () => {
    // The empty-state branch renders a <div> not a <textarea>; this
    // shouldn't fire because the field add forces the field-list branch.
    return await textarea.innerText()
  })
  expect(text).toContain('"student_photo"')
  expect(text).toMatch(/data:image\/png;base64,/)
  expect(text).toContain('...<placeholder>')
})
