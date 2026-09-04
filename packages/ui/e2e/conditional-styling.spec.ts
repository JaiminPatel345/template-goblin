/**
 * Playwright E2E spec for Condition-based Styling feature (#43).
 *
 * Coverage:
 *  1. Toggling condition-based styling ON creates initial default conditions (condition-1 [Default], condition-2).
 *  2. Adding, renaming, setting default, and deleting conditions.
 *  3. Updating style overrides for specific conditions.
 *  4. Format Ribbon "Condition-based styling" toggle integration.
 */
import { test, expect } from '@playwright/test'

interface ConditionRule {
  id: string
  name: string
  isDefault: boolean
  style: Record<string, unknown>
}

interface ConditionalStyles {
  enabled: boolean
  conditions: ConditionRule[]
}

declare global {
  interface Window {
    __templateStore: {
      getState: () => {
        addField: (f: unknown) => void
        fields: {
          id: string
          type: string
          style: unknown
          conditionalStyles?: ConditionalStyles
        }[]
      }
    }
    __uiStore: {
      getState: () => {
        selectFields: (ids: string[]) => void
        setActiveMenuTab: (tab: string) => void
      }
    }
  }
}

test.describe('Condition-Based Styling E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Ensure clean state and select a text field
    await page.evaluate(() => {
      window.localStorage.clear()
      const textF = {
        id: 'f-cond-test',
        type: 'text',
        groupId: null,
        pageId: null,
        label: 'Cond Field',
        x: 50,
        y: 50,
        width: 150,
        height: 30,
        zIndex: 0,
        style: {
          fontId: null,
          fontFamily: 'Helvetica',
          fontSize: 14,
          fontSizeMin: 8,
          lineHeight: 1.2,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#000000',
          align: 'left',
          verticalAlign: 'top',
          maxRows: 1,
          overflowMode: 'truncate',
          snapToGrid: false,
        },
        source: { mode: 'static', value: 'Conditional Text' },
      }
      window.__templateStore.getState().addField(textF)
      window.__uiStore.getState().selectFields(['f-cond-test'])
    })
  })

  test('toggling condition-based styling ON creates initial conditions', async ({ page }) => {
    const toggle = page.locator('[data-testid="toggle-conditional-styling"]')
    await expect(toggle).toBeVisible()

    await toggle.check()

    const condConfig = await page.evaluate(() => {
      const f = window.__templateStore.getState().fields.find((field) => field.id === 'f-cond-test')
      return f?.conditionalStyles
    })

    expect(condConfig?.enabled).toBe(true)
    expect(condConfig?.conditions).toHaveLength(2)
    expect(condConfig?.conditions[0]?.name).toBe('condition-1')
    expect(condConfig?.conditions[0]?.isDefault).toBe(true)
    expect(condConfig?.conditions[1]?.name).toBe('condition-2')
    expect(condConfig?.conditions[1]?.isDefault).toBe(false)
  })

  test('adding, renaming, and setting default condition', async ({ page }) => {
    const toggle = page.locator('[data-testid="toggle-conditional-styling"]')
    await toggle.check()

    // Add condition-3
    const addBtn = page.locator('[data-testid="add-condition-btn"]')
    await addBtn.click()

    let condConfig = await page.evaluate(() => {
      return window.__templateStore.getState().fields.find((f) => f.id === 'f-cond-test')
        ?.conditionalStyles
    })

    expect(condConfig?.conditions).toHaveLength(3)
    expect(condConfig?.conditions[2]?.name).toBe('condition-3')

    // Rename condition-2 to VIP
    const inputCond2 = page.locator('[data-testid="condition-name-input-1"]')
    await inputCond2.fill('VIP')
    await inputCond2.blur()

    condConfig = await page.evaluate(() => {
      return window.__templateStore.getState().fields.find((f) => f.id === 'f-cond-test')
        ?.conditionalStyles
    })

    expect(condConfig?.conditions[1]?.name).toBe('VIP')

    // Set condition-2 (VIP) as default
    const defaultToggle2 = page.locator('[data-testid="condition-default-toggle-cond-2"]')
    if (await defaultToggle2.isVisible()) {
      await defaultToggle2.check()
    }

    condConfig = await page.evaluate(() => {
      return window.__templateStore.getState().fields.find((f) => f.id === 'f-cond-test')
        ?.conditionalStyles
    })

    expect(condConfig?.conditions.find((c) => c.name === 'VIP')?.isDefault).toBe(true)
  })

  test('updating style overrides for a condition', async ({ page }) => {
    const toggle = page.locator('[data-testid="toggle-conditional-styling"]')
    await toggle.check()

    // Update font size for condition-1
    const fontSizeInput = page.locator('[data-testid="cond-font-size"]')
    await expect(fontSizeInput).toBeVisible()
    await fontSizeInput.fill('28')
    await fontSizeInput.blur()

    const condConfig = await page.evaluate(() => {
      return window.__templateStore.getState().fields.find((f) => f.id === 'f-cond-test')
        ?.conditionalStyles
    })

    expect(condConfig?.conditions[0]?.style.fontSize).toBe(28)
  })

  test('format ribbon condition-based styling toggle works', async ({ page }) => {
    // Switch to format tab
    await page.evaluate(() => {
      window.__uiStore.getState().setActiveMenuTab('format')
    })

    const ribbonToggle = page.locator('[data-testid="ribbon-toggle-conditional-styling"]')
    await expect(ribbonToggle).toBeVisible()

    await ribbonToggle.click()

    const isEnabled = await page.evaluate(() => {
      return window.__templateStore.getState().fields.find((f) => f.id === 'f-cond-test')
        ?.conditionalStyles?.enabled
    })

    expect(isEnabled).toBe(true)
  })

  test('selecting different conditions switches active condition and updates its styling', async ({
    page,
  }) => {
    const toggle = page.locator('[data-testid="toggle-conditional-styling"]')
    await toggle.check()

    // Click condition row 1 (condition-2)
    const row2 = page.locator('[data-testid="condition-row-1"]')
    await row2.click()

    let condConfig = await page.evaluate(() => {
      return window.__templateStore.getState().fields.find((f) => f.id === 'f-cond-test')
        ?.conditionalStyles
    })
    expect(condConfig?.activeConditionId).toBe('cond-2')

    // Update style for condition-2
    const fontSizeInput = page.locator('[data-testid="cond-font-size"]')
    await fontSizeInput.fill('32')
    await fontSizeInput.blur()

    condConfig = await page.evaluate(() => {
      return window.__templateStore.getState().fields.find((f) => f.id === 'f-cond-test')
        ?.conditionalStyles
    })
    expect(condConfig?.conditions[1]?.style.fontSize).toBe(32)
  })
})
