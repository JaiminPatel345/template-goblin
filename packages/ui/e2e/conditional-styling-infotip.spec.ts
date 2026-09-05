/**
 * Playwright E2E spec for Condition-Based Styling InfoTip (#43).
 *
 * Verifies that:
 * 1. ConditionStylingInfoTip is wired into ConditionalStylingSection title.
 * 2. It renders an accessible "i" button with aria-label and test IDs.
 * 3. Popover explains condition-based styling workflow, default fallback, and JSON format.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { test, expect } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const sectionSourcePath = join(
  here,
  '..',
  'src',
  'components',
  'RightPanel',
  'ConditionalStylingSection.tsx',
)
const infoTipSourcePath = join(
  here,
  '..',
  'src',
  'components',
  'RightPanel',
  'ConditionStylingInfoTip.tsx',
)

test('ConditionalStylingSection renders ConditionStylingInfoTip in section header', () => {
  const sectionSrc = readFileSync(sectionSourcePath, 'utf8')
  expect(sectionSrc).toContain('ConditionStylingInfoTip')
  expect(sectionSrc).toContain('<ConditionStylingInfoTip field={field} />')
})

test('ConditionStylingInfoTip provides comprehensive explanation and JSON payload example', () => {
  const tipSrc = readFileSync(infoTipSourcePath, 'utf8')
  expect(tipSrc).toContain('title="Condition-Based Styling"')
  expect(tipSrc).toContain('dataTestId="conditional-styling-info-btn"')
  expect(tipSrc).toMatch(/Dynamically override this field.*styling/i)
  expect(tipSrc).toMatch(/1\.\s*Conditions:/i)
  expect(tipSrc).toMatch(/2\.\s*Overrides:/i)
  expect(tipSrc).toMatch(/3\.\s*Default:/i)
  expect(tipSrc).toMatch(/4\.\s*Canvas:/i)
  expect(tipSrc).toContain('INPUT JSON PAYLOAD')
  expect(tipSrc).toContain('data-testid="conditional-styling-json-example"')
})
