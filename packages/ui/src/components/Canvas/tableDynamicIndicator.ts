import { Line, Rect, Textbox } from 'fabric'
import type { FabricObject } from 'fabric'
import type { FieldDefinition } from '@template-goblin/types'
import { resolveTableHeightMode } from '@template-goblin/types'

/**
 * Build visual indicators for tables with 'single_page_dynamic' height.
 * Shows break lines and an auto-expand badge at the bottom of the table rect
 * so the user sees that the table varies dynamically in height.
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
  if (resolveTableHeightMode(field.style) !== 'single_page_dynamic') return []

  const parts: FabricObject[] = []
  const primaryColor = '#4f46e5'

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

  // Small indicator badge centered horizontally at the bottom edge
  const badgeWidth = Math.min(160, Math.max(100, width * 0.7))
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

  parts.push(line1, line2, badgeBg)

  if (typeof document !== 'undefined') {
    const badgeText = new Textbox('⤓ Dynamic Height (Auto-expands)', {
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
