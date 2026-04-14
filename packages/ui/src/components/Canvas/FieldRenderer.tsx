import { Rect, Text, Group } from 'react-konva'
import type { FieldDefinition } from '@template-goblin/types'

interface FieldRendererProps {
  field: FieldDefinition
  isSelected: boolean
  onSelect: (id: string, shiftKey: boolean) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onContextMenu: (id: string, x: number, y: number) => void
  draggable: boolean
}

const FIELD_COLORS: Record<string, { fill: string; stroke: string }> = {
  text: { fill: 'rgba(37, 99, 235, 0.15)', stroke: '#2563eb' },
  image: { fill: 'rgba(22, 163, 74, 0.15)', stroke: '#16a34a' },
  loop: { fill: 'rgba(217, 119, 6, 0.15)', stroke: '#d97706' },
}

/**
 * Renders a single field on the Konva canvas as a colored rectangle with label.
 */
export function FieldRenderer({
  field,
  isSelected,
  onSelect,
  onDragEnd,
  onContextMenu,
  draggable,
}: FieldRendererProps) {
  const defaultColors = { fill: 'rgba(37, 99, 235, 0.15)', stroke: '#2563eb' }
  const colors = FIELD_COLORS[field.type] ?? defaultColors

  return (
    <Group
      x={field.x}
      y={field.y}
      draggable={draggable}
      onClick={(e) => onSelect(field.id, e.evt.shiftKey)}
      onTap={() => onSelect(field.id, false)}
      onDragEnd={(e) => {
        const node = e.target
        onDragEnd(field.id, node.x(), node.y())
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault()
        const stage = e.target.getStage()
        if (!stage) return
        const pointer = stage.getPointerPosition()
        if (!pointer) return
        onContextMenu(field.id, pointer.x, pointer.y)
      }}
    >
      <Rect
        width={field.width}
        height={field.height}
        fill={colors.fill}
        stroke={isSelected ? '#e94560' : colors.stroke}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={2}
      />
      <Text
        text={field.jsonKey || field.type}
        width={field.width}
        height={field.height}
        align="center"
        verticalAlign="middle"
        fontSize={Math.min(11, field.width / 8)}
        fill={colors.stroke}
        listening={false}
        padding={4}
      />
      {/* Type badge */}
      <Rect
        x={2}
        y={2}
        width={30}
        height={14}
        fill={colors.stroke}
        cornerRadius={2}
        listening={false}
      />
      <Text
        x={2}
        y={2}
        width={30}
        height={14}
        text={field.type.charAt(0).toUpperCase()}
        fontSize={9}
        fill="#fff"
        align="center"
        verticalAlign="middle"
        fontStyle="bold"
        listening={false}
      />
    </Group>
  )
}
