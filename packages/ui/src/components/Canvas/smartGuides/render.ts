/**
 * Render transient smart-alignment guide lines on the Fabric canvas (#41).
 *
 * Keeps a closure-local array of guide Lines so `clearGuides` doesn't have
 * to walk `canvas.getObjects()` every drag tick.
 */
import { Line as FabricLine, type Canvas as FabricCanvas } from 'fabric'
import {
  GUIDE_COLOR_OBJECT,
  GUIDE_COLOR_PAGE,
  GUIDE_COLOR_SPACING,
  GUIDE_STROKE_WIDTH,
} from './constants.js'
import type { AxisHit } from './snap.js'
import type { XCandidate, YCandidate } from './candidates.js'
import type { SpacingGap } from './equalSpacing.js'

/** Build a non-interactive guide line marked `__isSmartGuide` for cleanup. */
function makeGuide(coords: [number, number, number, number], color: string): FabricLine {
  const line = new FabricLine(coords, {
    stroke: color,
    strokeWidth: GUIDE_STROKE_WIDTH,
    strokeUniform: true,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    hoverCursor: 'default',
  })
  line.__isSmartGuide = true
  return line
}

/**
 * Smart-guide renderer instance. Tracks the lines it has added so it can
 * remove them cleanly without scanning the full object list.
 */
export class GuideRenderer {
  private readonly fc: FabricCanvas
  private readonly tracked: FabricLine[] = []
  private readonly pageWidth: number
  private readonly pageHeight: number

  constructor(fc: FabricCanvas, pageWidth: number, pageHeight: number) {
    this.fc = fc
    this.pageWidth = pageWidth
    this.pageHeight = pageHeight
  }

  /** Remove every guide we previously added. Safe to call repeatedly. */
  clear(): void {
    if (this.tracked.length === 0) return
    this.fc.remove(...this.tracked)
    this.tracked.length = 0
  }

  /** Draw an X-axis snap as a vertical guide spanning the page height. */
  drawXGuide(hit: AxisHit<XCandidate>): void {
    const x = hit.candidate.x
    const color = hit.candidate.source === 'page' ? GUIDE_COLOR_PAGE : GUIDE_COLOR_OBJECT
    const line = makeGuide([x, 0, x, this.pageHeight], color)
    this.tracked.push(line)
    this.fc.add(line)
    this.fc.bringObjectToFront(line)
  }

  /** Draw a Y-axis snap as a horizontal guide spanning the page width. */
  drawYGuide(hit: AxisHit<YCandidate>): void {
    const y = hit.candidate.y
    const color = hit.candidate.source === 'page' ? GUIDE_COLOR_PAGE : GUIDE_COLOR_OBJECT
    const line = makeGuide([0, y, this.pageWidth, y], color)
    this.tracked.push(line)
    this.fc.add(line)
    this.fc.bringObjectToFront(line)
  }

  /** Draw equal-spacing bracket marks for a gap pair. */
  drawSpacing(gaps: readonly SpacingGap[]): void {
    const tickLen = 4
    for (const g of gaps) {
      // The connecting bar
      if (g.axis === 'x') {
        const bar = makeGuide([g.start, g.perp, g.end, g.perp], GUIDE_COLOR_SPACING)
        this.tracked.push(bar)
        this.fc.add(bar)
        // End-tick at start
        const t1 = makeGuide(
          [g.start, g.perp - tickLen, g.start, g.perp + tickLen],
          GUIDE_COLOR_SPACING,
        )
        const t2 = makeGuide(
          [g.end, g.perp - tickLen, g.end, g.perp + tickLen],
          GUIDE_COLOR_SPACING,
        )
        this.tracked.push(t1, t2)
        this.fc.add(t1, t2)
      } else {
        const bar = makeGuide([g.perp, g.start, g.perp, g.end], GUIDE_COLOR_SPACING)
        this.tracked.push(bar)
        this.fc.add(bar)
        const t1 = makeGuide(
          [g.perp - tickLen, g.start, g.perp + tickLen, g.start],
          GUIDE_COLOR_SPACING,
        )
        const t2 = makeGuide(
          [g.perp - tickLen, g.end, g.perp + tickLen, g.end],
          GUIDE_COLOR_SPACING,
        )
        this.tracked.push(t1, t2)
        this.fc.add(t1, t2)
      }
    }
  }

  /** Force a re-render (call once per tick after `drawXGuide`/`drawYGuide`). */
  requestRender(): void {
    this.fc.requestRenderAll()
  }
}
