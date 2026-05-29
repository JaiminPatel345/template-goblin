/**
 * #172 — rotate any element via sidebar angle input + canvas rotation
 * handle, two-way sync.
 *
 * Validates:
 *   1. Selecting a field shows Fabric's rotation handle (no longer locked).
 *   2. The PropertiesPanel "Angle (°)" input writes through to
 *      `field.rotation` and the canvas group's angle updates live.
 *   3. Programmatic rotation in the store mirrors onto the Fabric group's
 *      `angle` property (store → canvas direction).
 *   4. `null` rotation is rendered identically to `0` (legacy default).
 *
 * Sanity-checks the schema invariant: rotation is stored on the field,
 * not the group, and the group's `lockRotation` is no longer forced.
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

async function seedField(page: Page): Promise<void> {
  await page.evaluate(() => {
    type W = Window & {
      __templateStore?: {
        getState: () => {
          addField: (f: unknown) => void
        }
      }
    }
    const api = (window as W).__templateStore!.getState()
    api.addField({
      id: 'f-spin',
      type: 'text',
      x: 100,
      y: 100,
      width: 120,
      height: 40,
      zIndex: 0,
      pageId: null,
      groupId: null,
      source: { mode: 'static', value: 'spin me' },
      style: {},
    })
  })
}

test.describe('#172 — element rotation, sidebar ↔ canvas sync', () => {
  test('Fabric group is no longer rotation-locked and reflects field.rotation on mount', async ({
    page,
  }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
    await seedField(page)

    // Apply rotation through the store (mirrors the sidebar Angle input
    // commit path) and read back the Fabric group's `angle`.
    const result = await page.evaluate(async () => {
      type FabObj = { __fieldId?: string; angle?: number; lockRotation?: boolean }
      type FabricCanvasLike = { getObjects: () => FabObj[] }
      type W = Window & {
        __fabricCanvas?: FabricCanvasLike
        __templateStore?: {
          getState: () => { updateField: (id: string, p: unknown) => void }
        }
      }
      const w = window as W
      const api = w.__templateStore!.getState()
      api.updateField('f-spin', { rotation: 45 })
      // Wait a tick for React → Fabric reconcile to apply the angle.
      await new Promise((r) => setTimeout(r, 60))
      const grp = w.__fabricCanvas!.getObjects().find((o) => o.__fieldId === 'f-spin')
      return { angle: grp?.angle, lockRotation: grp?.lockRotation ?? false }
    })

    expect(result.lockRotation).toBe(false)
    expect(result.angle).toBeCloseTo(45, 1)
  })

  test('setting rotation back to null normalises angle to 0', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
    await seedField(page)

    const finalAngle = await page.evaluate(async () => {
      type FabObj = { __fieldId?: string; angle?: number }
      type W = Window & {
        __fabricCanvas?: { getObjects: () => FabObj[] }
        __templateStore?: {
          getState: () => { updateField: (id: string, p: unknown) => void }
        }
      }
      const w = window as W
      const api = w.__templateStore!.getState()
      api.updateField('f-spin', { rotation: 120 })
      await new Promise((r) => setTimeout(r, 60))
      api.updateField('f-spin', { rotation: null })
      await new Promise((r) => setTimeout(r, 60))
      const grp = w.__fabricCanvas!.getObjects().find((o) => o.__fieldId === 'f-spin')
      return grp?.angle ?? null
    })
    expect(finalAngle).toBe(0)
  })

  test('PropertiesPanel exposes Angle (°) input wired to field.rotation', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
    await seedField(page)

    // Select the seeded field through the store so the PropertiesPanel
    // renders its angle input.
    await page.evaluate(() => {
      type W = Window & {
        __uiStore?: { getState: () => { selectFields: (ids: string[]) => void } }
      }
      ;(window as W).__uiStore!.getState().selectFields(['f-spin'])
    })

    // The Angle label is unique to RotationSection.
    const angleLabel = page.getByText(/^Angle \(°\)$/)
    await expect(angleLabel).toBeVisible({ timeout: 3000 })

    // Type a value into the corresponding number input. The label lives
    // in the same `.tg-form-row` container as the NumberInput, so we
    // scope through that ancestor.
    const angleInput = angleLabel.locator('..').locator('input[type="number"]')
    await angleInput.fill('72')
    await angleInput.blur()

    // Round-trip: the field's rotation should now read 72, and the
    // Fabric group should be rotated to match.
    const result = await page.evaluate(async () => {
      type Field = { id: string; rotation?: number | null }
      type FabObj = { __fieldId?: string; angle?: number }
      type W = Window & {
        __fabricCanvas?: { getObjects: () => FabObj[] }
        __templateStore?: { getState: () => { fields: Field[] } }
      }
      await new Promise((r) => setTimeout(r, 60))
      const fields = (window as W).__templateStore!.getState().fields
      const grp = (window as W).__fabricCanvas!.getObjects().find((o) => o.__fieldId === 'f-spin')
      return {
        storedRotation: fields.find((f) => f.id === 'f-spin')?.rotation,
        canvasAngle: grp?.angle,
      }
    })
    expect(result.storedRotation).toBe(72)
    expect(result.canvasAngle).toBeCloseTo(72, 1)
  })
})
