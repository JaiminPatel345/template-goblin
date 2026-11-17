import { Line, Rect, Textbox } from 'fabric'
import type { FabricObject } from 'fabric'
import type { FieldDefinition } from '@template-goblin/types'
import { resolveTableHeightMode } from '@template-goblin/types'

/**
 * Build visual indicators for tables with dynamic height ('single_page_dynamic' or 'multipage').
 * For 'single_page_dynamic': shows double break lines and auto-expand badge at bottom.
 * For 'multipage': shows wavy/tilted break lines on the end of both vertical sides
 * (with no bottom line) and an unbounded height badge.
 *
 * @param field The field definition
 * @param width Table width
 * @param height Table height
 * @returns Array of Fabric objects
 */
export function buildDynamicTableIndicators(
  field: FieldDefinition,
  width: number,
  height: number,
): FabricObject[] {
  if (field.type !== 'table' || !field.style) return []
  const mode = resolveTableHeightMode(field.style)
  if (mode !== 'single_page_dynamic' && mode !== 'multipage') return []

  const parts: FabricObject[] = []
  const primaryColor = '#4f46e5'

  if (mode === 'single_page_dynamic') {
    // Double dashed break line at the bottom boundary
    const line1 = new Line([0, height - 2, width, height - 2], {
      stroke: primaryColor,
      strokeWidth: 1.5,
      strokeDashArray: [6, 3],
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top',
    })

    const line2 = new Line([0, height + 2, width, height + 2], {
      stroke: primaryColor,
      strokeWidth: 1.5,
      strokeDashArray: [6, 3],
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top',
    })

    parts.push(line1, line2)
  }

  // Small indicator badge centered horizontally at the bottom edge
  const badgeTextStr =
    mode === 'multipage' ? '⤓ Multi-Page (Unbounded Height)' : '⤓ Dynamic Height (Auto-expands)'

  const badgeWidth = Math.min(180, Math.max(120, width * 0.7))
  const badgeHeight = 16
  const badgeLeft = Math.max(0, (width - badgeWidth) / 2)
  const badgeTop = height - badgeHeight / 2

  const badgeBg = new Rect({
    left: badgeLeft,
    top: badgeTop,
    width: badgeWidth,
    height: badgeHeight,
    rx: 4,
    ry: 4,
    fill: primaryColor,
    selectable: false,
    evented: false,
    originX: 'left',
    originY: 'top',
  })

  parts.push(badgeBg)

  if (typeof document !== 'undefined') {
    const badgeText = new Textbox(badgeTextStr, {
      left: badgeLeft,
      top: badgeTop + 2,
      width: badgeWidth,
      fontSize: 9,
      fontFamily: 'Helvetica, Arial, sans-serif',
      fill: '#ffffff',
      textAlign: 'center',
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top',
    })
    parts.push(badgeText)
  }

  return parts
}
