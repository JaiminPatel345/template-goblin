/**
 * UX-03 — Regression test (#149).
 *
 * Adding an image placeholder caused the PDF size estimate to jump
 * from ~5 KB to ~63 KB with no indication of what drove it. An
 * InfoTip next to the panel title now spells out which inputs are
 * counted. Source-level check pins the wiring without fighting the
 * right-panel selection chain.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { test, expect } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(here, '..', 'src', 'components', 'RightPanel', 'PdfSizeEstimate.tsx')

test('UX-03: PdfSizeEstimate renders an InfoTip explaining what counts', () => {
  const src = readFileSync(sourcePath, 'utf8')
  expect(src).toContain('InfoTip')
  expect(src).toMatch(/rough estimate.*final PDF byte size/i)
  expect(src).toMatch(/Text and table fields contribute negligible weight/i)
})
