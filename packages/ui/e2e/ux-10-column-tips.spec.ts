/**
 * UX-10 — Regression test (#156).
 *
 * Table column rows have both a Key (data binding) and a Label
 * (display name) input. Non-technical users had no way to know
 * which one matters for the JSON shape. InfoTip glyphs next to
 * each label spell it out.
 *
 * Reading the source through a stable build-time check is enough
 * to pin the tooltip text — re-rendering the full canvas/right-
 * panel chain to surface the actual nodes here proved flaky against
 * a complex Zustand selection chain. The runtime end of this is
 * verified manually in Chrome (see PR #157 description).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { test, expect } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(here, '..', 'src', 'components', 'RightPanel', 'TableColumnsSection.tsx')

test('UX-10: TableColumnsSection emits InfoTip explaining Key vs Label', () => {
  const src = readFileSync(sourcePath, 'utf8')
  // Both labels carry their data-testid.
  expect(src).toContain('data-testid="col-key-label"')
  expect(src).toContain('data-testid="col-label-label"')
  // Both InfoTip texts spell out the distinction.
  expect(src).toMatch(/data binding.*JSON property name/i)
  expect(src).toMatch(/display name shown in the column header/i)
})
