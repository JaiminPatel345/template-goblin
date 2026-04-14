import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Text, Line, Group, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import type { FieldDefinition, FieldType } from '@template-goblin/types'

/* ------------------------------------------------------------------ */
/*  Colour palette per field type                                     */
/* ------------------------------------------------------------------ */
const FIELD_COLORS: Record<FieldType, { fill: string; stroke: string }> = {
  text: { fill: 'rgba(37,99,235,0.25)', stroke: '#60a5fa' },
  image: { fill: 'rgba(22,163,74,0.25)', stroke: '#4ade80' },
  loop: { fill: 'rgba(217,119,6,0.25)', stroke: '#fb923c' },
}

const SELECTED_STROKE = '#e94560'

/* ------------------------------------------------------------------ */
/*  Snap helper                                                       */
/* ------------------------------------------------------------------ */
function snap(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

/* ------------------------------------------------------------------ */
/*  CanvasArea                                                        */
/* ------------------------------------------------------------------ */
export function CanvasArea() {
  /* ----- store reads ------------------------------------------------ */
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
  const isDrawing = useUiStore((s) => s.isDrawing)
  const drawStart = useUiStore((s) => s.drawStart)
  const selectField = useUiStore((s) => s.selectField)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const toggleFieldSelection = useUiStore((s) => s.toggleFieldSelection)
  const setContextMenu = useUiStore((s) => s.setContextMenu)
  const startDrawing = useUiStore((s) => s.startDrawing)
  const stopDrawing = useUiStore((s) => s.stopDrawing)
  const setActiveTool = useUiStore((s) => s.setActiveTool)

  /* ----- refs ------------------------------------------------------- */
  const stageRef = useRef<Konva.Stage | null>(null)
  const layerRef = useRef<Konva.Layer | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  /* ----- local state ------------------------------------------------ */
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  )

  /* ----- load background image -------------------------------------- */
  useEffect(() => {
    if (!backgroundDataUrl) {
      setBgImage(null)
      return
    }
    const img = new window.Image()
    img.src = backgroundDataUrl
    img.onload = () => setBgImage(img)
  }, [backgroundDataUrl])

  /* ----- observe container size ------------------------------------- */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ----- attach Transformer to selected nodes ----------------------- */
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

  /* ----- derived ---------------------------------------------------- */
  const locked = meta.locked
  const stageW = meta.width * zoom
  const stageH = meta.height * zoom
  const isPlacing =
    activeTool === 'addText' || activeTool === 'addImage' || activeTool === 'addLoop'
  const sortedFields = [...fields].sort((a, b) => a.zIndex - b.zIndex)
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1

  /* ------------------------------------------------------------------ */
  /*  Event handlers                                                    */
  /* ------------------------------------------------------------------ */
  const getPointerPos = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current
    if (!stage) return null
    const pointer = stage.getPointerPosition()
    if (!pointer) return null
    return { x: pointer.x / zoom, y: pointer.y / zoom }
  }, [zoom])

  /* ---- Stage mouse-down ------------------------------------------- */
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (locked) return

      // Right click is handled by context menu
      if (e.evt.button === 2) return

      // If clicking on the Stage background (empty area)
      const clickedOnEmpty =
        e.target === e.target.getStage() ||
        e.target.name() === 'bg-rect' ||
        e.target.name() === 'bg-image'

      if (isPlacing && clickedOnEmpty) {
        const pos = getPointerPos()
        if (!pos) return
        const snappedX = snap(pos.x, gridSize, showGrid)
        const snappedY = snap(pos.y, gridSize, showGrid)
        startDrawing(snappedX, snappedY)
        setDrawRect({ x: snappedX, y: snappedY, w: 0, h: 0 })
        return
      }

      if (clickedOnEmpty) {
        clearSelection()
      }
    },
    [locked, isPlacing, getPointerPos, gridSize, showGrid, startDrawing, clearSelection],
  )

  /* ---- Stage mouse-move ------------------------------------------- */
  const handleStageMouseMove = useCallback(() => {
    if (!isDrawing || !drawStart) return
    const pos = getPointerPos()
    if (!pos) return
    const snappedX = snap(pos.x, gridSize, showGrid)
    const snappedY = snap(pos.y, gridSize, showGrid)
    setDrawRect({
      x: Math.min(drawStart.x, snappedX),
      y: Math.min(drawStart.y, snappedY),
      w: Math.abs(snappedX - drawStart.x),
      h: Math.abs(snappedY - drawStart.y),
    })
  }, [isDrawing, drawStart, getPointerPos, gridSize, showGrid])

  /* ---- Stage mouse-up --------------------------------------------- */
  const handleStageMouseUp = useCallback(() => {
    if (!isDrawing || !drawRect || !drawStart) return

    const MIN_SIZE = 10
    const { x, y, w, h } = drawRect

    if (w >= MIN_SIZE && h >= MIN_SIZE) {
      const toolToType: Record<string, FieldType> = {
        addText: 'text',
        addImage: 'image',
        addLoop: 'loop',
      }
      const fieldType = toolToType[activeTool]
      if (fieldType) {
        createField(fieldType, x, y, w, h)
      }
    }

    stopDrawing()
    setDrawRect(null)
    setActiveTool('select')
  }, [isDrawing, drawRect, drawStart, activeTool])

  /* ---- Create a new field ----------------------------------------- */
  const createField = useCallback(
    (type: FieldType, x: number, y: number, width: number, height: number) => {
      const baseField = {
        id: '', // store generates
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
          ...baseField,
          type: 'text',
          jsonKey: 'texts.',
          placeholder: 'Text',
          style: {
            fontId: null,
            fontFamily: 'Helvetica',
            fontSize: 12,
            fontSizeDynamic: true,
            fontSizeMin: 6,
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
          ...baseField,
          type: 'image',
          jsonKey: 'images.',
          placeholder: 'Image',
          style: {
            fit: 'contain',
            placeholderFilename: null,
          },
        } as FieldDefinition)
      } else if (type === 'loop') {
        addField({
          ...baseField,
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

  /* ---- Field click ------------------------------------------------ */
  const handleFieldClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, fieldId: string) => {
      if (locked) return
      e.cancelBubble = true
      if (e.evt.shiftKey) {
        toggleFieldSelection(fieldId)
      } else {
        selectField(fieldId)
      }
    },
    [locked, selectField, toggleFieldSelection],
  )

  /* ---- Field drag ------------------------------------------------- */
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

  /* ---- Transformer resize end ------------------------------------ */
  const handleTransformEnd = useCallback(
    (fieldId: string, node: Konva.Node) => {
      if (locked) return

      const scaleX = node.scaleX()
      const scaleY = node.scaleY()

      const newWidth = snap(Math.max(10, node.width() * scaleX), gridSize, showGrid)
      const newHeight = snap(Math.max(10, node.height() * scaleY), gridSize, showGrid)
      const newX = snap(node.x(), gridSize, showGrid)
      const newY = snap(node.y(), gridSize, showGrid)

      // Reset scale back to 1 and apply the computed size
      node.scaleX(1)
      node.scaleY(1)
      node.width(newWidth)
      node.height(newHeight)
      node.position({ x: newX, y: newY })

      moveField(fieldId, newX, newY)
      resizeField(fieldId, newWidth, newHeight)
    },
    [locked, gridSize, showGrid, moveField, resizeField],
  )

  /* ---- Right-click / context menu --------------------------------- */
  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>, fieldId: string) => {
      e.evt.preventDefault()
      e.cancelBubble = true
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, fieldId })
    },
    [setContextMenu],
  )

  /* ---- Stage-level context menu (prevent default) ----------------- */
  const handleStageContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault()
  }, [])

  /* ------------------------------------------------------------------ */
  /*  Grid lines                                                        */
  /* ------------------------------------------------------------------ */
  const renderGrid = useCallback(() => {
    if (!showGrid) return null
    const lines: React.ReactElement[] = []

    // Vertical lines
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

    // Horizontal lines
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

  /* ------------------------------------------------------------------ */
  /*  No background? Show placeholder.                                  */
  /* ------------------------------------------------------------------ */
  if (!backgroundDataUrl) {
    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <div className="tg-canvas-empty">
          <div className="tg-canvas-empty-icon">&#128444;</div>
          <span>Upload a background image to start</span>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'auto',
      }}
    >
      <Stage
        ref={stageRef}
        width={stageW}
        height={stageH}
        scaleX={zoom}
        scaleY={zoom}
        style={{ cursor: isPlacing ? 'crosshair' : 'default' }}
        pixelRatio={dpr}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onContextMenu={handleStageContextMenu}
      >
        <Layer ref={layerRef}>
          {/* -- Background image ------------------------------------ */}
          {bgImage && (
            <Rect
              name="bg-image"
              x={0}
              y={0}
              width={meta.width}
              height={meta.height}
              fillPatternImage={bgImage}
              fillPatternScaleX={meta.width / bgImage.width}
              fillPatternScaleY={meta.height / bgImage.height}
              listening={!isPlacing}
            />
          )}

          {/* -- Fallback background rect (click target) ------------- */}
          {!bgImage && (
            <Rect
              name="bg-rect"
              x={0}
              y={0}
              width={meta.width}
              height={meta.height}
              fill="#ffffff"
            />
          )}

          {/* -- Grid overlay ---------------------------------------- */}
          {renderGrid()}

          {/* -- Fields ---------------------------------------------- */}
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
                onDragEnd={(e) => handleFieldDragEnd(field.id, e.target)}
                onTransformEnd={(e) => handleTransformEnd(field.id, e.target)}
                onContextMenu={(e) => handleContextMenu(e, field.id)}
              >
                {/* Field rectangle */}
                <Rect
                  width={field.width}
                  height={field.height}
                  fill={colors.fill}
                  stroke={isSelected ? SELECTED_STROKE : colors.stroke}
                  strokeWidth={isSelected ? 2 / zoom : 1 / zoom}
                  cornerRadius={2 / zoom}
                />

                {/* Field label */}
                <Text
                  text={field.jsonKey}
                  x={4 / zoom}
                  y={4 / zoom}
                  fontSize={11 / zoom}
                  fontFamily="sans-serif"
                  fill={colors.stroke}
                  width={field.width - 8 / zoom}
                  ellipsis={true}
                  wrap="none"
                  listening={false}
                />

                {/* Field type badge */}
                <Text
                  text={field.type.toUpperCase()}
                  x={4 / zoom}
                  y={field.height - 16 / zoom}
                  fontSize={9 / zoom}
                  fontFamily="sans-serif"
                  fontStyle="bold"
                  fill={colors.stroke}
                  opacity={0.7}
                  listening={false}
                />
              </Group>
            )
          })}

          {/* -- Draw-to-place rectangle ----------------------------- */}
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

          {/* -- Transformer (resize handles) ------------------------ */}
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
            boundBoxFunc={(_oldBox, newBox) => {
              // Enforce minimum size
              if (newBox.width < 10 || newBox.height < 10) return _oldBox
              return newBox
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

      {/* -- Locked overlay ------------------------------------------- */}
      {locked && (
        <div className="tg-locked-overlay">
          <div className="tg-locked-badge">
            <span>&#128274;</span>
            <span>Template locked</span>
          </div>
        </div>
      )}
    </div>
  )
}
