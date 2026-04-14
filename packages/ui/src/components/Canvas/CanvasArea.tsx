import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image as KonvaImage,
  Line,
  Group,
  Transformer,
} from 'react-konva'
import type Konva from 'konva'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import type { FieldDefinition, FieldType } from '@template-goblin/types'

const FIELD_COLORS: Record<FieldType, { fill: string; stroke: string; text: string }> = {
  text: { fill: 'rgba(37,99,235,0.35)', stroke: '#60a5fa', text: '#ffffff' },
  image: { fill: 'rgba(22,163,74,0.35)', stroke: '#4ade80', text: '#ffffff' },
  loop: { fill: 'rgba(217,119,6,0.35)', stroke: '#fb923c', text: '#ffffff' },
}

const SELECTED_STROKE = '#e94560'

function snap(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

export function CanvasArea() {
  const meta = useTemplateStore((s) => s.meta)
  const fields = useTemplateStore((s) => s.fields)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)
  const addField = useTemplateStore((s) => s.addField)
  const moveField = useTemplateStore((s) => s.moveField)
  const resizeField = useTemplateStore((s) => s.resizeField)

  const activeTool = useUiStore((s) => s.activeTool)
  const selectedFieldIds = useUiStore((s) => s.selectedFieldIds)
  const showGrid = useUiStore((s) => s.showGrid)
  const gridSize = useUiStore((s) => s.gridSize)
  const zoom = useUiStore((s) => s.zoom)
  const setZoom = useUiStore((s) => s.setZoom)
  const isDrawing = useUiStore((s) => s.isDrawing)
  const drawStart = useUiStore((s) => s.drawStart)
  const selectField = useUiStore((s) => s.selectField)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const toggleFieldSelection = useUiStore((s) => s.toggleFieldSelection)
  const setContextMenu = useUiStore((s) => s.setContextMenu)
  const startDrawing = useUiStore((s) => s.startDrawing)
  const stopDrawing = useUiStore((s) => s.stopDrawing)
  const setActiveTool = useUiStore((s) => s.setActiveTool)
  const setPendingBackground = useUiStore((s) => s.setPendingBackground)
  const setShowPageSizeDialog = useUiStore((s) => s.setShowPageSizeDialog)

  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load background image
  useEffect(() => {
    if (!backgroundDataUrl) {
      setBgImage(null)
      return
    }
    const img = new window.Image()
    img.src = backgroundDataUrl
    img.onload = () => setBgImage(img)
  }, [backgroundDataUrl])

  // Auto-fit zoom only when background first loads (not on every resize)
  const hasAutoFitted = useRef(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    if (backgroundDataUrl && meta.width > 0 && meta.height > 0 && !hasAutoFitted.current) {
      const w = el.clientWidth
      const h = el.clientHeight
      const padding = 40
      const scaleX = (w - padding * 2) / meta.width
      const scaleY = (h - padding * 2) / meta.height
      const fitZoom = Math.min(scaleX, scaleY, 2)
      setZoom(Math.max(0.1, fitZoom))
      hasAutoFitted.current = true
    }

    if (!backgroundDataUrl) {
      hasAutoFitted.current = false
    }

    return undefined
  }, [backgroundDataUrl, meta.width, meta.height])

  // Attach Transformer to selected nodes
  useEffect(() => {
    const tr = transformerRef.current
    const stage = stageRef.current
    if (!tr || !stage) return

    if (meta.locked) {
      tr.nodes([])
      return
    }

    const nodes: Konva.Node[] = selectedFieldIds
      .map((id) => stage.findOne(`#field-${id}`))
      .filter(Boolean) as Konva.Node[]

    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedFieldIds, fields, meta.locked])

  // Scroll-to-zoom handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta))
      setZoom(newZoom)
    },
    [zoom, setZoom],
  )

  const locked = meta.locked
  const stageW = meta.width * zoom
  const stageH = meta.height * zoom
  const isPlacing =
    activeTool === 'addText' || activeTool === 'addImage' || activeTool === 'addLoop'
  const sortedFields = [...fields].sort((a, b) => a.zIndex - b.zIndex)

  const getPointerPos = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current
    if (!stage) return null
    const pointer = stage.getPointerPosition()
    if (!pointer) return null
    return { x: pointer.x / zoom, y: pointer.y / zoom }
  }, [zoom])

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (locked) return
      if (e.evt.button === 2) return

      const clickedOnEmpty =
        e.target === e.target.getStage() ||
        e.target.name() === 'bg-image' ||
        e.target.name() === 'bg-rect'

      if (isPlacing && clickedOnEmpty) {
        const pos = getPointerPos()
        if (!pos) return
        const sx = snap(pos.x, gridSize, showGrid)
        const sy = snap(pos.y, gridSize, showGrid)
        startDrawing(sx, sy)
        setDrawRect({ x: sx, y: sy, w: 0, h: 0 })
        return
      }

      if (clickedOnEmpty) clearSelection()
    },
    [locked, isPlacing, getPointerPos, gridSize, showGrid, startDrawing, clearSelection],
  )

  const handleStageMouseMove = useCallback(() => {
    if (!isDrawing || !drawStart) return
    const pos = getPointerPos()
    if (!pos) return
    const sx = snap(pos.x, gridSize, showGrid)
    const sy = snap(pos.y, gridSize, showGrid)
    setDrawRect({
      x: Math.min(drawStart.x, sx),
      y: Math.min(drawStart.y, sy),
      w: Math.abs(sx - drawStart.x),
      h: Math.abs(sy - drawStart.y),
    })
  }, [isDrawing, drawStart, getPointerPos, gridSize, showGrid])

  const handleStageMouseUp = useCallback(() => {
    if (!isDrawing || !drawRect || !drawStart) return

    const { x, y, w, h } = drawRect
    if (w >= 10 && h >= 10) {
      const toolToType: Record<string, FieldType> = {
        addText: 'text',
        addImage: 'image',
        addLoop: 'loop',
      }
      const fieldType = toolToType[activeTool]
      if (fieldType) {
        createField(fieldType, x, y, w, h)

        // Bug 5: For loop fields, select the newly created field so the right
        // panel opens immediately and the user can configure columns.
        if (fieldType === 'loop') {
          // addField generates an id; grab the last field from the store
          setTimeout(() => {
            const currentFields = useTemplateStore.getState().fields
            const newLoop = currentFields[currentFields.length - 1]
            if (newLoop && newLoop.type === 'loop') {
              selectField(newLoop.id)
            }
          }, 0)
        }
      }
    }

    stopDrawing()
    setDrawRect(null)
    setActiveTool('select')
  }, [isDrawing, drawRect, drawStart, activeTool, selectField])

  const createField = useCallback(
    (type: FieldType, x: number, y: number, width: number, height: number) => {
      const base = {
        id: '',
        type,
        groupId: null,
        required: false,
        x,
        y,
        width,
        height,
        zIndex: fields.length,
      }

      if (type === 'text') {
        addField({
          ...base,
          type: 'text',
          jsonKey: 'texts.',
          placeholder: 'Text',
          style: {
            fontId: null,
            fontFamily: 'Helvetica',
            fontSize: 12,
            fontSizeDynamic: true,
            fontSizeMin: 11,
            lineHeight: 1.2,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: '#000000',
            align: 'left',
            verticalAlign: 'top',
            maxRows: 3,
            overflowMode: 'dynamic_font',
            snapToGrid: true,
          },
        } as FieldDefinition)
      } else if (type === 'image') {
        addField({
          ...base,
          type: 'image',
          jsonKey: 'images.',
          placeholder: 'Image',
          style: { fit: 'contain', placeholderFilename: null },
        } as FieldDefinition)
      } else if (type === 'loop') {
        addField({
          ...base,
          type: 'loop',
          jsonKey: 'loops.',
          placeholder: 'Table',
          style: {
            maxRows: 20,
            maxColumns: 5,
            multiPage: false,
            headerStyle: {
              fontFamily: 'Helvetica',
              fontSize: 10,
              fontWeight: 'bold',
              align: 'left',
              color: '#000000',
              backgroundColor: '#f0f0f0',
            },
            rowStyle: {
              fontFamily: 'Helvetica',
              fontSize: 10,
              fontWeight: 'normal',
              color: '#000000',
              overflowMode: 'dynamic_font',
              fontSizeDynamic: true,
              fontSizeMin: 6,
              lineHeight: 1.2,
            },
            cellStyle: {
              borderWidth: 0.5,
              borderColor: '#cccccc',
              paddingTop: 2,
              paddingBottom: 2,
              paddingLeft: 4,
              paddingRight: 4,
            },
            columns: [],
          },
        } as FieldDefinition)
      }
    },
    [addField, fields.length],
  )

  const handleFieldClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, fieldId: string) => {
      if (locked) return
      e.cancelBubble = true
      if (e.evt.shiftKey) toggleFieldSelection(fieldId)
      else selectField(fieldId)
    },
    [locked, selectField, toggleFieldSelection],
  )

  const handleFieldDragEnd = useCallback(
    (fieldId: string, node: Konva.Node) => {
      if (locked) return
      const x = snap(node.x(), gridSize, showGrid)
      const y = snap(node.y(), gridSize, showGrid)
      node.position({ x, y })
      moveField(fieldId, x, y)
    },
    [locked, gridSize, showGrid, moveField],
  )

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>, fieldId: string) => {
      e.evt.preventDefault()
      e.cancelBubble = true
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, fieldId })
    },
    [setContextMenu],
  )

  // --- File upload handler (for empty state + drag-and-drop) ---
  function handleFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new window.Image()
      img.onload = () => {
        const bufReader = new FileReader()
        bufReader.onload = () => {
          setPendingBackground({
            dataUrl,
            buffer: bufReader.result as ArrayBuffer,
            width: img.naturalWidth,
            height: img.naturalHeight,
          })
          setShowPageSizeDialog(true)
        }
        bufReader.readAsArrayBuffer(file)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFileUpload(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = ''
  }

  // --- Grid ---
  const renderGrid = useCallback(() => {
    if (!showGrid) return null
    const lines: React.ReactElement[] = []
    for (let x = 0; x <= meta.width; x += gridSize) {
      lines.push(
        <Line
          key={`gv-${x}`}
          points={[x, 0, x, meta.height]}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1 / zoom}
          listening={false}
        />,
      )
    }
    for (let y = 0; y <= meta.height; y += gridSize) {
      lines.push(
        <Line
          key={`gh-${y}`}
          points={[0, y, meta.width, y]}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1 / zoom}
          listening={false}
        />,
      )
    }
    return lines
  }, [showGrid, meta.width, meta.height, gridSize, zoom])

  // ===== EMPTY STATE: No background uploaded =====
  if (!backgroundDataUrl) {
    return (
      <div
        ref={containerRef}
        className={`tg-upload-zone ${isDragOver ? 'tg-upload-zone--active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="tg-upload-content">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.4"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <h2 className="tg-upload-title">Upload a background image</h2>
          <p className="tg-upload-subtitle">
            Drag and drop an image here, or click below to browse
          </p>
          <button
            className="tg-btn tg-btn--primary tg-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleInputChange}
          />
          <p className="tg-upload-hint">
            Supports PNG, JPG, WEBP — this will be your template background
          </p>
        </div>
      </div>
    )
  }

  // ===== CANVAS STATE: Background uploaded =====
  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        background: 'var(--canvas-bg)',
      }}
    >
      <Stage
        ref={stageRef}
        width={stageW}
        height={stageH}
        scaleX={zoom}
        scaleY={zoom}
        style={{
          cursor: isPlacing ? 'crosshair' : 'default',
          boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
        }}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        <Layer>
          {/* Background image — rendered at full canvas size */}
          {bgImage ? (
            <KonvaImage
              name="bg-image"
              image={bgImage}
              x={0}
              y={0}
              width={meta.width}
              height={meta.height}
              listening={!isPlacing}
            />
          ) : (
            <Rect
              name="bg-rect"
              x={0}
              y={0}
              width={meta.width}
              height={meta.height}
              fill="#ffffff"
            />
          )}

          {/* Grid overlay */}
          {renderGrid()}

          {/* Fields */}
          {sortedFields.map((field) => {
            const colors = FIELD_COLORS[field.type]
            const isSelected = selectedFieldIds.includes(field.id)

            return (
              <Group
                key={field.id}
                id={`field-${field.id}`}
                x={field.x}
                y={field.y}
                draggable={!locked}
                onClick={(e) => handleFieldClick(e, field.id)}
                onTap={(e) =>
                  handleFieldClick(e as unknown as Konva.KonvaEventObject<MouseEvent>, field.id)
                }
                onDragStart={() => {
                  // Select the field when drag starts — ensures Transformer
                  // attaches to the dragged field, not a previously selected one
                  if (!selectedFieldIds.includes(field.id)) {
                    selectField(field.id)
                  }
                }}
                onDragEnd={(e) => {
                  const group = e.target
                  handleFieldDragEnd(field.id, group)
                }}
                onTransformEnd={(e) => {
                  if (locked) return
                  const node = e.target
                  const scaleX = node.scaleX()
                  const scaleY = node.scaleY()
                  const newWidth = snap(Math.max(20, node.width() * scaleX), gridSize, showGrid)
                  const newHeight = snap(Math.max(20, node.height() * scaleY), gridSize, showGrid)
                  // Reset scale
                  node.scaleX(1)
                  node.scaleY(1)
                  // Update store
                  moveField(
                    field.id,
                    snap(node.x(), gridSize, showGrid),
                    snap(node.y(), gridSize, showGrid),
                  )
                  resizeField(field.id, newWidth, newHeight)
                }}
                onContextMenu={(e) => handleContextMenu(e, field.id)}
              >
                <Rect
                  width={field.width}
                  height={field.height}
                  fill={colors.fill}
                  stroke={isSelected ? SELECTED_STROKE : colors.stroke}
                  strokeWidth={isSelected ? 2 / zoom : 1 / zoom}
                  cornerRadius={2 / zoom}
                  listening={true}
                  onClick={(e) => handleFieldClick(e, field.id)}
                />
                <Text
                  text={field.jsonKey}
                  x={4 / zoom}
                  y={4 / zoom}
                  fontSize={11 / zoom}
                  fontFamily="sans-serif"
                  fill={colors.text}
                  width={field.width - 8 / zoom}
                  ellipsis={true}
                  wrap="none"
                  listening={false}
                />
                <Text
                  text={field.type.toUpperCase()}
                  x={4 / zoom}
                  y={field.height - 16 / zoom}
                  fontSize={9 / zoom}
                  fontFamily="sans-serif"
                  fontStyle="bold"
                  fill={colors.text}
                  opacity={0.7}
                  listening={false}
                />
              </Group>
            )
          })}

          {/* Draw-to-place rectangle */}
          {isDrawing && drawRect && (
            <Rect
              x={drawRect.x}
              y={drawRect.y}
              width={drawRect.w}
              height={drawRect.h}
              fill="rgba(233,69,96,0.15)"
              stroke="#e94560"
              strokeWidth={1 / zoom}
              dash={[6 / zoom, 3 / zoom]}
              listening={false}
            />
          )}

          {/* Transformer */}
          <Transformer
            ref={transformerRef}
            borderStroke={SELECTED_STROKE}
            borderStrokeWidth={1.5 / zoom}
            anchorStroke={SELECTED_STROKE}
            anchorFill="#ffffff"
            anchorSize={8 / zoom}
            anchorCornerRadius={2 / zoom}
            rotateEnabled={false}
            keepRatio={false}
            ignoreStroke={true}
            boundBoxFunc={(_oldBox, newBox) => {
              const width = Math.max(20, newBox.width)
              const height = Math.max(20, newBox.height)
              return { ...newBox, width, height }
            }}
            enabledAnchors={[
              'top-left',
              'top-center',
              'top-right',
              'middle-left',
              'middle-right',
              'bottom-left',
              'bottom-center',
              'bottom-right',
            ]}
          />
        </Layer>
      </Stage>
    </div>
  )
}
