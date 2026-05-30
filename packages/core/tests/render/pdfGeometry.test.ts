/**
 * PDF-geometry tests — generate a real PDF and read back text positions with
 * PDF.js to assert the rendered layout matches the template (and therefore
 * the editor canvas, which renders from the same template coordinates).
 *
 * This is the "test against the generated PDF as well" harness: it catches
 * renderer-faithfulness bugs the canvas/store tests can't see — e.g. text
 * rendered at the top of a box instead of vertically centred.
 */
import type { LoadedTemplate, InputJSON, TextField, TextFieldStyle } from '@template-goblin/types'
import { generatePDF } from '../../src/generate.js'
import { makeManifest, staticText, TEXT_STYLE } from '../helpers/fixtures.js'
import { parsePdfGeometry, findRun } from '../helpers/pdfGeometry.js'

const EMPTY_DATA: InputJSON = { texts: {}, tables: {}, images: {}, links: {} }

function loaded(fields: TextField[]): LoadedTemplate {
  return {
    manifest: makeManifest({ fields }),
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: new Map(),
    placeholders: new Map(),
    staticImages: new Map(),
  }
}

function style(overrides: Partial<TextFieldStyle>): TextFieldStyle {
  return { ...TEXT_STYLE, ...overrides }
}

describe('PDF geometry — layout matches the template', () => {
  it('vertical spacing between two fields in the PDF equals the template spacing', async () => {
    // Two single-line top-aligned fields, 200pt apart in the template.
    const top = staticText(
      'a',
      'Alpha',
      { x: 60, y: 100, width: 200, height: 40 },
      style({
        fontSize: 14,
        verticalAlign: 'top',
      }),
    )
    const bottom = staticText(
      'b',
      'Bravo',
      { x: 60, y: 300, width: 200, height: 40 },
      style({
        fontSize: 14,
        verticalAlign: 'top',
      }),
    )

    const [page] = await parsePdfGeometry(await generatePDF(loaded([top, bottom]), EMPTY_DATA))
    const a = findRun(page!, 'Alpha')
    const b = findRun(page!, 'Bravo')
    expect(a).toBeDefined()
    expect(b).toBeDefined()

    // Both share font + size + vertical-align, so the baseline-to-baseline
    // distance equals the template field-to-field distance (200pt).
    expect(Math.abs(b!.baselineY - a!.baselineY)).toBeCloseTo(200, 0)
  })

  it('left-aligned text starts at the field left edge; right-aligned sits further right', async () => {
    const left = staticText(
      'l',
      'Edge',
      { x: 50, y: 80, width: 300, height: 30 },
      style({
        fontSize: 14,
        align: 'left',
      }),
    )
    const right = staticText(
      'r',
      'Edge',
      { x: 50, y: 200, width: 300, height: 30 },
      style({
        fontSize: 14,
        align: 'right',
      }),
    )

    const [page] = await parsePdfGeometry(await generatePDF(loaded([left, right]), EMPTY_DATA))
    const runs = page!.texts.filter((t) => t.str.includes('Edge'))
    expect(runs).toHaveLength(2)
    const [lhs, rhs] = [...runs].sort((p, q) => p.baselineY - q.baselineY)

    // Left-aligned run starts at (≈) the field's left edge.
    expect(lhs!.x).toBeCloseTo(50, 0)
    // Right-aligned run of the same text in the same-width box sits further right.
    expect(rhs!.x).toBeGreaterThan(lhs!.x + 100)
  })

  it('vertically-centred text is centred in the box, not rendered at the top', async () => {
    // Single line, fontSize 20 (lineHeight 24) in a 200pt box → fits; middle
    // anchor should place the baseline near the box centre (y + h/2 = 200),
    // NOT near the top (~y).
    const field = staticText(
      'c',
      'Middle',
      { x: 60, y: 100, width: 240, height: 200 },
      style({
        fontSize: 20,
        verticalAlign: 'middle',
      }),
    )
    const [page] = await parsePdfGeometry(await generatePDF(loaded([field]), EMPTY_DATA))
    const run = findRun(page!, 'Middle')
    expect(run).toBeDefined()

    // The glyph ink (cap-top → baseline) must be optically centred, so the
    // baseline sits BELOW the box centre by ~half the cap height. Centring the
    // line box instead (glyph at the slot top) would leave the baseline at or
    // above the centre — this range fails that "renders high" regression.
    const fontSize = 20
    const boxCenter = 200 // y + height / 2
    expect(run!.baselineY).toBeGreaterThan(boxCenter + 0.2 * fontSize)
    expect(run!.baselineY).toBeLessThan(boxCenter + 0.5 * fontSize)
  })

  it('oversized centred text still renders, centred (the preview-drop regression)', async () => {
    // fontSize 80 in a 130pt box: the block is taller than the box, so only
    // the fitting line is kept and centred — matching the canvas. Before the
    // fix this rendered as an empty (background-only) rectangle.
    const field = staticText(
      'big',
      'WYSIWYG',
      { x: 60, y: 100, width: 450, height: 130 },
      style({
        fontSize: 80,
        verticalAlign: 'middle',
        overflowMode: 'truncate',
      }),
    )
    const [page] = await parsePdfGeometry(await generatePDF(loaded([field]), EMPTY_DATA))
    const run = page!.texts.find((t) => t.str.length > 0)
    expect(run).toBeDefined() // text is NOT dropped
    // Optically centred in the 130pt box (centre at y+65 = 165): the baseline
    // sits ~half a cap-height below centre. The pre-fix "renders high"
    // baseline (~174) is below this band and fails.
    const fontSize = 80
    const boxCenter = 165
    expect(run!.baselineY).toBeGreaterThan(boxCenter + 0.2 * fontSize)
    expect(run!.baselineY).toBeLessThan(boxCenter + 0.5 * fontSize)
  })
})
