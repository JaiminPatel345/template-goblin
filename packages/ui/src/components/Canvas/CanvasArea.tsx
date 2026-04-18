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
import { createDefaultField } from '../../utils/defaults.js'
import { snapshotSameAsPrevious } from '../../utils/pageSnapshot.js'
import { FIELD_COLORS } from '../../theme/fieldColors.js'
import { fieldCanvasLabel } from './fieldLabel.js'
import { shouldRenderFillRect } from './rectFill.js'
import type { FieldType, PageDefinition, PageBackgroundType } from '@template-goblin/types'

/**
 * Max-fit font sizer. Given the rect's interior (after padding), pick the
 * largest font size at which `text` fits within `width` × `height` when
 * wrapped at word boundaries. Capped at `min(48, height * 0.8)`.
 *
 * Strategy: binary-search over integer font sizes; use a canvas 2D context
 * to measure, wrapping greedily. No Konva `measureSize` dependency — the
 * 2D-canvas measurement matches Konva.Text closely enough for label sizing.
 */
let __labelMeasureCtx: CanvasRenderingContext2D | null = null
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (__labelMeasureCtx) return __labelMeasureCtx
  const cv = document.createElement('canvas')
  __labelMeasureCtx = cv.getContext('2d')
  return __labelMeasureCtx
}

function wrapTextToLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text]
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? current + ' ' + w : w
    const width = ctx.measureText(test).width
    if (width <= maxWidth || current === '') {
      current = test
    } else {
      lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines
}

function fitFontSize(
  text: string,
  rectWidth: number,
  rectHeight: number,
  fontFamily: string,
): number {
  if (!text || rectWidth <= 0 || rectHeight <= 0) return 8
  const ctx = getMeasureCtx()
  if (!ctx) {
    // SSR / jsdom fallback: pick a size proportional to the rect height.
    return Math.max(8, Math.min(48, Math.floor(rectHeight * 0.4)))
  }
  const lineHeightFactor = 1.2
  const upper = Math.max(8, Math.min(48, Math.floor(rectHeight * 0.8)))
  let lo = 8
  let hi = upper
  let best = 8

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    ctx.font = `${mid}px ${fontFamily}`
    const lines = wrapTextToLines(ctx, text, rectWidth)
    const totalHeight = lines.length * mid * lineHeightFactor
    const maxLineWidth = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0)
    if (maxLineWidth <= rectWidth && totalHeight <= rectHeight) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
}

const SELECTED_STROKE = '#e94560'

function snap(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

let pageIdCounter = 0
function generatePageId(): string {
  pageIdCounter++
  return `page-${Date.now()}-${pageIdCounter}`
}

/**
 * Empty-state onboarding picker. Shown on page 0 when no background has been
 * chosen yet. Offers two options:
 *   - Upload image: reuses the existing upload flow (PageSizeDialog follows).
 *   - Solid color: HTML `<input type="color">` + hex input, applied to page 0
 *     as `backgroundType: 'color'` with the chosen `#RRGGBB`.
 * Defaults to `#FFFFFF` if the user hits Apply without touching the picker.
 */
function OnboardingPicker({
  isDragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onChooseImage,
  onChooseColor,
  fileInputRef,
  onFileChange,
  setContainerRef,
}: {
  isDragOver: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onChooseImage: () => void
  onChooseColor: (hex: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  setContainerRef: (el: HTMLDivElement | null) => void
}) {
  const [mode, setMode] = useState<'choose' | 'color'>('choose')
  const [color, setColor] = useState('#ffffff')

  return (
    <div
      ref={setContainerRef}
      className={`tg-upload-zone ${isDragOver ? 'tg-upload-zone--active' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="tg-upload-content">
        {mode === 'choose' && (
          <>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <h2 className="tg-upload-title">Choose a background</h2>
            <p className="tg-upload-subtitle">Upload an image or start with a solid color.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <button
                className="tg-btn tg-btn--primary tg-upload-btn"
                onClick={onChooseImage}
                data-testid="onboarding-upload-image"
              >
                Upload image
              </button>
              <button
                className="tg-btn tg-upload-btn"
                onClick={() => setMode('color')}
                data-testid="onboarding-solid-color"
              >
                Solid color
              </button>
            </div>
            <input
              ref={(el) => {
                if (fileInputRef && typeof fileInputRef === 'object') {
                  ;(fileInputRef as { current: HTMLInputElement | null }).current = el
                }
              }}
              type="file"
              accept="image/*"
              hidden
              onChange={onFileChange}
            />
            <p className="tg-upload-hint">
              Drag and drop an image here too — supports PNG, JPG, WEBP.
            </p>
          </>
        )}

        {mode === 'color' && (
          <>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            <h2 className="tg-upload-title">Pick a background color</h2>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 56, height: 40, border: 'none', cursor: 'pointer' }}
                data-testid="onboarding-color-input"
              />
              <input
                type="text"
                className="tg-input"
                value={color}
                onChange={(e) => {
                  const v = e.target.value
                  // Accept partial typing; validate & persist only on Apply.
                  setColor(v)
                }}
                style={{ width: 100, fontFamily: 'monospace' }}
                maxLength={7}
                data-testid="onboarding-color-hex"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="tg-btn" onClick={() => setMode('choose')}>
                Back
              </button>
              <button
                className="tg-btn tg-btn--primary"
                onClick={() => {
                  // Normalise: default to white if the user cleared the input,
                  // and lowercase the hex for consistency.
                  const hex = /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : '#ffffff'
                  onChooseColor(hex)
                }}
                data-testid="onboarding-color-apply"
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Inline dialog for adding a new page */
function AddPageDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (bgType: PageBackgroundType, bgColor?: string, bgFile?: File) => void
}) {
  const [mode, setMode] = useState<'choose' | 'color'>('choose')
  const [color, setColor] = useState('#ffffff')
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="tg-dialog-overlay" onClick={onClose}>
      <div className="tg-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="tg-dialog-title">Add New Page</h3>
        <p>Choose a background for the new page:</p>

        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="tg-btn"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Upload new image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onAdd('image', undefined, file)
                e.target.value = ''
              }}
            />

            <button
              className="tg-btn"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              onClick={() => onAdd('inherit')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <path d="M7 12h10M12 7v10" />
              </svg>
              Same as previous page
            </button>

            <button
              className="tg-btn"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              onClick={() => setMode('color')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              Solid color
            </button>
          </div>
        )}

        {mode === 'color' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Color:</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: '48px', height: '32px', border: 'none', cursor: 'pointer' }}
              />
              <span
                style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}
              >
                {color}
              </span>
            </div>
            <div className="tg-dialog-actions">
              <button className="tg-btn" onClick={() => setMode('choose')}>
                Back
              </button>
              <button className="tg-btn tg-btn--primary" onClick={() => onAdd('color', color)}>
                Add Page
              </button>
            </div>
          </div>
        )}

        {mode === 'choose' && (
          <div className="tg-dialog-actions">
            <button className="tg-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function CanvasArea() {
  const meta = useTemplateStore((s) => s.meta)
  const fields = useTemplateStore((s) => s.fields)
  const pages = useTemplateStore((s) => s.pages)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)
  const pageBackgroundDataUrls = useTemplateStore((s) => s.pageBackgroundDataUrls)
  const pageBackgroundBuffers = useTemplateStore((s) => s.pageBackgroundBuffers)
  const placeholderBuffers = useTemplateStore((s) => s.placeholderBuffers)
  const addField = useTemplateStore((s) => s.addField)
  const moveField = useTemplateStore((s) => s.moveField)
  const resizeField = useTemplateStore((s) => s.resizeField)
  const addPage = useTemplateStore((s) => s.addPage)
  const removePage = useTemplateStore((s) => s.removePage)
  const setPage0BackgroundColor = useTemplateStore((s) => s.setPage0BackgroundColor)

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
  const currentPageId = useUiStore((s) => s.currentPageId)
  const setCurrentPage = useUiStore((s) => s.setCurrentPage)

  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const [showAddPageDialog, setShowAddPageDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Resolve the current page's effective background data URL.
  // For backward compat: if no pages array, use legacy backgroundDataUrl.
  const resolveCurrentBgDataUrl = useCallback((): string | null => {
    // No pages defined — legacy single-page mode
    if (pages.length === 0) return backgroundDataUrl

    // Page 0 (null) — use legacy background
    if (currentPageId === null) return backgroundDataUrl

    const page = pages.find((p) => p.id === currentPageId)
    if (!page) return backgroundDataUrl

    if (page.backgroundType === 'image') {
      return pageBackgroundDataUrls.get(page.id) ?? null
    }

    if (page.backgroundType === 'inherit') {
      // Walk back to find the nearest non-inherit page
      for (let i = page.index - 1; i >= 0; i--) {
        const prev = pages.find((p) => p.index === i)
        if (!prev) continue
        if (prev.backgroundType === 'image') {
          return pageBackgroundDataUrls.get(prev.id) ?? null
        }
        if (prev.backgroundType === 'color') {
          return null // color pages have no image
        }
        // continue if also 'inherit'
      }
      // Fell through to page 0 legacy
      return backgroundDataUrl
    }

    // backgroundType === 'color' — no image, color is handled by the Rect
    return null
  }, [pages, currentPageId, backgroundDataUrl, pageBackgroundDataUrls])

  // Resolve the current page's background color (for 'color' type pages).
  // Page 0 (the implicit first page, `currentPageId === null`) may now also
  // be a color page if the user picked "Solid color" during onboarding — in
  // that case the page lives in `pages` at index 0 with no legacy
  // `backgroundDataUrl` set.
  const resolveCurrentBgColor = useCallback((): string | null => {
    if (pages.length === 0) return null

    if (currentPageId === null) {
      const page0 = pages.find((p) => p.index === 0)
      if (page0 && page0.backgroundType === 'color') return page0.backgroundColor
      return null
    }

    const page = pages.find((p) => p.id === currentPageId)
    if (!page) return null

    if (page.backgroundType === 'color') return page.backgroundColor
    return null
  }, [pages, currentPageId])

  const currentBgDataUrl = resolveCurrentBgDataUrl()
  const currentBgColor = resolveCurrentBgColor()

  // Load background image for the current page
  useEffect(() => {
    if (!currentBgDataUrl) {
      setBgImage(null)
      return
    }
    const img = new window.Image()
    img.src = currentBgDataUrl
    img.onload = () => setBgImage(img)
  }, [currentBgDataUrl])

  // Auto-fit zoom only when background first loads (not on every resize)
  const hasAutoFitted = useRef(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const hasBg = currentBgDataUrl || currentBgColor
    if (hasBg && meta.width > 0 && meta.height > 0 && !hasAutoFitted.current) {
      const w = el.clientWidth
      const h = el.clientHeight
      const padding = 40
      const scaleX = (w - padding * 2) / meta.width
      const scaleY = (h - padding * 2) / meta.height
      const fitZoom = Math.min(scaleX, scaleY, 2)
      setZoom(Math.max(0.1, fitZoom))
      hasAutoFitted.current = true
    }

    if (!hasBg) {
      hasAutoFitted.current = false
    }

    return undefined
  }, [currentBgDataUrl, currentBgColor, meta.width, meta.height])

  // Resolve each placeholder filename referenced by a visible image field into
  // an HTMLImageElement. Used by the render loop to skip the coloured fill rect
  // (IMP-3) when a placeholder image is available. We keep the map keyed by
  // filename so multiple fields pointing at the same asset reuse the element.
  const [placeholderImages, setPlaceholderImages] = useState<Map<string, HTMLImageElement>>(
    new Map(),
  )
  useEffect(() => {
    // Collect all image filenames visible fields care about on any page (we
    // cheaply resolve the whole template so field-page switches don't refetch).
    const filenames = new Set<string>()
    for (const f of fields) {
      if (f.type !== 'image' || !f.source) continue
      if (f.source.mode === 'dynamic') {
        const ph = f.source.placeholder as unknown
        if (ph && typeof ph === 'object' && 'filename' in ph) {
          const name = (ph as { filename: unknown }).filename
          if (typeof name === 'string' && name.length > 0) filenames.add(name)
        }
      } else if (f.source.mode === 'static') {
        const v = f.source.value as unknown
        if (v && typeof v === 'object' && 'filename' in v) {
          const name = (v as { filename: unknown }).filename
          if (typeof name === 'string' && name.length > 0) filenames.add(name)
        }
      }
    }

    const next = new Map<string, HTMLImageElement>()
    let pending = 0
    let resolved = 0
    filenames.forEach((filename) => {
      const buf = placeholderBuffers.get(filename)
      if (!buf) return
      pending++
      const blob = new Blob([buf])
      const url = URL.createObjectURL(blob)
      const img = new window.Image()
      img.onload = () => {
        next.set(filename, img)
        resolved++
        if (resolved === pending) {
          setPlaceholderImages(new Map(next))
        }
      }
      img.onerror = () => {
        resolved++
        if (resolved === pending) {
          setPlaceholderImages(new Map(next))
        }
      }
      img.src = url
    })

    if (pending === 0) {
      setPlaceholderImages(new Map())
    }
    // Note: we intentionally don't revoke object URLs on cleanup — they live
    // for the lifetime of the page's HTMLImageElement; React will GC them.
  }, [fields, placeholderBuffers])

  // Filter fields by current page
  const pageFields = fields.filter((f) => {
    // null pageId means page 0 — show when currentPageId is null
    if (currentPageId === null) return f.pageId === null || f.pageId === undefined
    return f.pageId === currentPageId
  })

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
  }, [selectedFieldIds, pageFields, meta.locked])

  // Scroll-to-zoom / scroll / pan handler. Attached via a **ref callback**
  // (`setContainerRef` below, REQ-040/AC-041) so the listener re-binds every
  // time the container node changes — notably the onboarding → canvas
  // transition, where the old `useEffect([])` pattern latched onto the
  // onboarding picker's div and was orphaned when the canvas container
  // mounted under a different React subtree.
  //
  // Modifier rules (REQ-037..039, AC-037..040):
  //   - ctrl/meta      → zoom at cursor; clamped [0.1, 5]; step ±0.1
  //   - shift (no mod) → horizontal scroll
  //   - none           → vertical scroll
  // We always preventDefault + stopPropagation on the container-scoped wheel
  // so the browser never scrolls the page when the cursor is over the canvas.
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const container = e.currentTarget as HTMLDivElement | null
    if (!container) return

    const isZoom = e.ctrlKey || e.metaKey
    if (isZoom) {
      const oldZoom = useUiStore.getState().zoom
      const step = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.1, Math.min(5, oldZoom + step))
      if (newZoom === oldZoom) return

      // Cursor position relative to container viewport.
      const rect = container.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const scale = newZoom / oldZoom

      useUiStore.getState().setZoom(newZoom)

      // The Stage's rendered size grows on the next paint; adjust scroll on
      // the next animation frame so the cursor point stays stationary.
      requestAnimationFrame(() => {
        container.scrollLeft = (container.scrollLeft + cx) * scale - cx
        container.scrollTop = (container.scrollTop + cy) * scale - cy
      })
      return
    }

    if (e.shiftKey) {
      // Horizontal scroll. Most mice only populate deltaY; trackpads may send
      // deltaX. Prefer deltaY (classic wheel) then fall back to deltaX.
      container.scrollLeft += e.deltaY || e.deltaX
      return
    }

    container.scrollTop += e.deltaY
  }, [])

  const setContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      // Detach from previous node, then attach to the new one.
      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', onWheel)
      }
      containerRef.current = el
      if (el) {
        el.addEventListener('wheel', onWheel, { passive: false })
      }
    },
    [onWheel],
  )

  // Pan state: activated either by (a) middle mouse button down, or
  // (b) spacebar held + left mouse button down. Canva uses spacebar; Figma
  // uses spacebar. We support both that and the middle-click shortcut.
  const [isPanning, setIsPanning] = useState(false)
  const [spacePanMode, setSpacePanMode] = useState(false)
  const panStart = useRef<{ x: number; y: number } | null>(null)

  // Global keyboard listener for spacebar → pan-mode toggle. Ignores key
  // presses that originate from inputs/textareas so typing a space in a text
  // field doesn't hijack the canvas cursor.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      // Only prevent page scroll when we're about to consume space for pan.
      e.preventDefault()
      setSpacePanMode(true)
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      setSpacePanMode(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button OR (left button + space-pan-mode) starts panning.
      const isMiddle = e.button === 1
      const isLeftWithSpace = e.button === 0 && spacePanMode
      if (isMiddle || isLeftWithSpace) {
        e.preventDefault()
        setIsPanning(true)
        panStart.current = { x: e.clientX, y: e.clientY }
      }
    },
    [spacePanMode],
  )

  const handleMouseMovePan = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || !panStart.current) return
      const container = containerRef.current
      if (!container) return

      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      container.scrollLeft -= dx
      container.scrollTop -= dy
      panStart.current = { x: e.clientX, y: e.clientY }
    },
    [isPanning],
  )

  const handleMouseUpPan = useCallback(() => {
    setIsPanning(false)
    panStart.current = null
  }, [])

  const locked = meta.locked
  const stageW = meta.width * zoom
  const stageH = meta.height * zoom
  const isPlacing =
    activeTool === 'addText' || activeTool === 'addImage' || activeTool === 'addLoop'
  const sortedFields = [...pageFields].sort((a, b) => a.zIndex - b.zIndex)

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
        addLoop: 'table',
      }
      const fieldType = toolToType[activeTool]
      if (fieldType) {
        createField(fieldType, x, y, w, h)

        // Auto-select the newly created field so user can edit its details
        setTimeout(() => {
          const currentFields = useTemplateStore.getState().fields
          const newField = currentFields[currentFields.length - 1]
          if (newField) {
            selectField(newField.id)
          }
        }, 0)
      }
    }

    stopDrawing()
    setDrawRect(null)
    setActiveTool('select')
  }, [isDrawing, drawRect, drawStart, activeTool, selectField])

  const createField = useCallback(
    (type: FieldType, x: number, y: number, width: number, height: number) => {
      // `addField` in the store generates the final id; pass empty string here.
      const field = createDefaultField(type, {
        id: '',
        groupId: null,
        pageId: currentPageId,
        x,
        y,
        width,
        height,
        zIndex: fields.length,
      })
      addField(field)
    },
    [addField, fields.length, currentPageId],
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

  const handleFieldDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, fieldId: string) => {
      if (locked) return
      e.cancelBubble = true
      // Double-click toggles: deselect if already selected, select if not
      if (selectedFieldIds.includes(fieldId)) {
        clearSelection()
      } else {
        selectField(fieldId)
      }
    },
    [locked, selectedFieldIds, selectField, clearSelection],
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

  // --- Add page handler ---
  //
  // "Same as previous" (bgType === 'inherit') is treated as a one-time
  // SNAPSHOT of the current previous page's background, NOT a live reference.
  // This matches user expectation: if the previous page changes or is deleted
  // later, the snapshotted page keeps its original look. (Fix for
  // BUG-F — removing the middle page silently changed downstream pages when
  // they stored backgroundType: 'inherit'.)
  function handleAddPage(bgType: PageBackgroundType, bgColor?: string, bgFile?: File) {
    setShowAddPageDialog(false)
    const pageId = generatePageId()
    const index = pages.length

    // Resolve "same as previous" into a concrete snapshot of the previous page.
    if (bgType === 'inherit') {
      const { page: snap, sourceId } = snapshotSameAsPrevious(pages, pageId, index)
      if (snap.backgroundType === 'image' && sourceId) {
        const prevDataUrl = pageBackgroundDataUrls.get(sourceId) ?? null
        const prevBuffer = pageBackgroundBuffers.get(sourceId) ?? null
        if (prevDataUrl && prevBuffer) {
          const cloned = prevBuffer.slice(0)
          addPage(snap, prevDataUrl, cloned)
        } else {
          addPage(snap)
        }
      } else {
        addPage(snap)
      }
      setCurrentPage(pageId)
      return
    }

    const page: PageDefinition = {
      id: pageId,
      index,
      backgroundType: bgType,
      backgroundColor: bgType === 'color' ? (bgColor ?? '#ffffff') : null,
      backgroundFilename: bgType === 'image' ? `backgrounds/${pageId}.png` : null,
    }

    if (bgType === 'image' && bgFile) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const bufReader = new FileReader()
        bufReader.onload = () => {
          const buffer = bufReader.result as ArrayBuffer
          addPage(page, dataUrl, buffer)
          setCurrentPage(pageId)
        }
        bufReader.readAsArrayBuffer(bgFile)
      }
      reader.readAsDataURL(bgFile)
    } else {
      addPage(page)
      setCurrentPage(pageId)
    }
  }

  const reset = useTemplateStore((s) => s.reset)

  // --- Remove page handler ---
  //
  // Behaviour:
  //   - Non-last page (including the explicit page 0 PageDefinition when other
  //     pages exist): remove as today; fields on that page are reassigned to
  //     page 0 by the store's `removePage`, and remaining pages re-index.
  //   - Last page in the template (i.e. the user is about to delete the ONLY
  //     page the canvas is rendering): prompt for confirmation and, on OK,
  //     reset the whole template to the empty onboarding state so the user
  //     starts fresh from the background picker.
  //
  // "Last page" detection:
  //   Page 0 is implicit when `pages` is empty OR when `pages` contains no
  //   entry with `index === 0`. In either case the legacy single-page canvas
  //   counts as 1. Total visible pages = 1 (implicit page 0) + pages.length if
  //   page 0 is implicit, otherwise = pages.length (page 0 is explicit).
  function handleRemovePage(pageId: string | null) {
    const page0IsExplicit = pages.some((p) => p.index === 0)
    const visiblePageCount = page0IsExplicit ? pages.length : 1 + pages.length

    if (visiblePageCount <= 1) {
      const ok = window.confirm(
        'Deleting the last page will clear all fields and settings. Continue?',
      )
      if (!ok) return
      reset()
      setCurrentPage(null)
      clearSelection()
      return
    }

    // Non-last: delete as today.
    if (pageId === null) {
      // Deleting the implicit page 0 while other explicit pages exist.
      // We remove the implicit page 0's fields (pageId === null) AND promote
      // the remaining explicit pages so one of them becomes the new page 0
      // (index 0). Without re-indexing we would leave an index gap
      // (pages start at 1, 2, ...) which violates the schema's "contiguous,
      // 0-based, no gaps" rule and breaks canvas rendering (BUG-D root cause).
      const state = useTemplateStore.getState()
      const nextFields = state.fields.filter((f) => f.pageId !== null)
      const sortedPages = [...state.pages].sort((a, b) => a.index - b.index)
      const reindexedPages = sortedPages.map((p, i) => ({ ...p, index: i }))
      state.loadFromManifest(
        state.meta,
        nextFields,
        state.fonts,
        state.groups,
        null,
        null,
        state.fontBuffers,
        state.placeholderBuffers,
        reindexedPages,
        state.pageBackgroundDataUrls,
        state.pageBackgroundBuffers,
      )
      setCurrentPage(reindexedPages[0]?.id ?? null)
      clearSelection()
      return
    }

    removePage(pageId)
    setCurrentPage(null)
    clearSelection()
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

  // --- Page navigation bar ---
  const renderPageBar = () => {
    // Only show when there is a background (canvas mode)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '6px 12px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {/* Tab rendering — one tab per visible page.
            Page 1 is either (a) the implicit legacy page-0 (pageId=null) when
            no PageDefinition with index 0 exists, OR (b) the explicit
            PageDefinition at index 0. It is NEVER both at once — the old code
            always rendered a null-pageId "Page 1" even when an explicit
            index-0 page also existed, which produced a phantom extra tab
            after solid-color onboarding (and then "deleting Page 2" nuked
            everything because pages.length was 1). */}
        {(() => {
          const sorted = [...pages].sort((a, b) => a.index - b.index)
          const explicitFirst = sorted[0]?.index === 0 ? sorted[0] : undefined
          const firstTab = explicitFirst
            ? { id: explicitFirst.id, label: 'Page 1', pageId: explicitFirst.id as string | null }
            : { id: '__implicit_page_0__', label: 'Page 1', pageId: null as string | null }
          const remaining = explicitFirst ? sorted.slice(1) : sorted
          const tabs: Array<{ key: string; label: string; pageId: string | null }> = [
            { key: firstTab.id, label: firstTab.label, pageId: firstTab.pageId },
            ...remaining.map((p, i) => ({
              key: p.id,
              label: `Page ${i + 2}`,
              pageId: p.id as string | null,
            })),
          ]
          return tabs.map((tab, idx) => (
            <div key={tab.key} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                className={`tg-btn ${currentPageId === tab.pageId ? 'tg-btn--active' : ''}`}
                style={{ fontSize: '11px', padding: '4px 12px' }}
                onClick={() => {
                  setCurrentPage(tab.pageId)
                  clearSelection()
                }}
              >
                {tab.label}
              </button>
              <button
                className="tg-btn tg-btn--danger"
                style={{ fontSize: '10px', padding: '2px 6px', marginLeft: '2px' }}
                title="Remove this page"
                data-testid={idx === 0 ? 'remove-page-1' : undefined}
                onClick={() => handleRemovePage(tab.pageId)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))
        })()}

        {/* Add page button */}
        <button
          className="tg-btn"
          style={{ fontSize: '11px', padding: '4px 10px', marginLeft: '4px' }}
          onClick={() => setShowAddPageDialog(true)}
          title="Add new page"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Page
        </button>
      </div>
    )
  }

  // ===== EMPTY STATE: No background chosen (page 0 has no image and no color) =====
  // Page 0 is "empty" when:
  //   - there's no legacy backgroundDataUrl, AND
  //   - there's no explicit page-0 PageDefinition of type 'color'.
  const page0 = pages.find((p) => p.index === 0)
  const page0IsColor = page0?.backgroundType === 'color'
  if (!backgroundDataUrl && !page0IsColor) {
    return (
      <OnboardingPicker
        isDragOver={isDragOver}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onChooseImage={() => fileInputRef.current?.click()}
        onChooseColor={(hex) => {
          setPage0BackgroundColor(hex)
        }}
        fileInputRef={fileInputRef}
        onFileChange={handleInputChange}
        setContainerRef={setContainerRef}
      />
    )
  }

  // ===== CANVAS STATE: Background uploaded =====
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div
        ref={setContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMovePan}
        onMouseUp={handleMouseUpPan}
        onMouseLeave={handleMouseUpPan}
        style={{
          width: '100%',
          flex: 1,
          // Fix for Workstream 5 (left-side zoom clipping): plain
          // `justify-content: center` + `align-items: center` with
          // `overflow: auto` has a long-standing bug where, when the flex
          // item is larger than the container, the overflow on the start
          // side (left/top) is unreachable — flex centers the item and
          // distributes negative free space only on the end side. The
          // `safe` keyword tells the browser to fall back to `start`
          // alignment when overflow would otherwise clip content, yielding
          // symmetric scrollbars on both axes at high zoom.
          display: 'flex',
          justifyContent: 'safe center',
          alignItems: 'safe center',
          cursor: isPanning
            ? 'grabbing'
            : spacePanMode
              ? 'grab'
              : isPlacing
                ? 'crosshair'
                : 'default',
          overflow: 'auto',
          background: 'var(--canvas-bg)',
          minHeight: 0,
        }}
      >
        <div data-testid="canvas-stage-wrapper" style={{ flexShrink: 0 }}>
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
              {/* Background: image or solid color */}
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
                  fill={currentBgColor ?? '#ffffff'}
                />
              )}

              {/* Grid overlay */}
              {renderGrid()}

              {/* Fields for current page */}
              {sortedFields.map((field) => {
                const colors = FIELD_COLORS[field.type]
                const isSelected = selectedFieldIds.includes(field.id)

                // Resolve image asset (W3 / IMP-3). Image fields with a
                // placeholder filename (dynamic) OR a static value filename
                // skip the coloured rect fill.
                let imageEl: HTMLImageElement | null = null
                if (field.type === 'image' && field.source) {
                  let filename: string | null = null
                  if (field.source.mode === 'dynamic') {
                    const ph = field.source.placeholder as unknown
                    if (ph && typeof ph === 'object' && 'filename' in ph) {
                      const name = (ph as { filename: unknown }).filename
                      if (typeof name === 'string' && name.length > 0) filename = name
                    }
                  } else {
                    const v = field.source.value as unknown
                    if (v && typeof v === 'object' && 'filename' in v) {
                      const name = (v as { filename: unknown }).filename
                      if (typeof name === 'string' && name.length > 0) filename = name
                    }
                  }
                  if (filename) {
                    imageEl = placeholderImages.get(filename) ?? null
                  }
                }

                // Fill-rect visibility per IMP-3/IMP-4 — delegated to the
                // testable `shouldRenderFillRect` helper so this branch and
                // the unit tests share a single source of truth.
                const shouldFill = shouldRenderFillRect(field, {
                  placeholderResolved: imageEl !== null,
                })

                const label = fieldCanvasLabel(field)
                const innerPad = 6 / zoom
                const labelW = Math.max(0, field.width - innerPad * 2)
                const labelH = Math.max(0, field.height - innerPad * 2)
                const labelFontSize = label ? fitFontSize(label, labelW, labelH, 'sans-serif') : 0

                return (
                  <Group
                    key={field.id}
                    id={`field-${field.id}`}
                    x={field.x}
                    y={field.y}
                    draggable={!locked}
                    onClick={(e) => handleFieldClick(e, field.id)}
                    onDblClick={(e) => handleFieldDblClick(e, field.id)}
                    onTap={(e) =>
                      handleFieldClick(e as unknown as Konva.KonvaEventObject<MouseEvent>, field.id)
                    }
                    onDblTap={(e) =>
                      handleFieldDblClick(
                        e as unknown as Konva.KonvaEventObject<MouseEvent>,
                        field.id,
                      )
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
                      const newHeight = snap(
                        Math.max(20, node.height() * scaleY),
                        gridSize,
                        showGrid,
                      )
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
                    {/* Fill rect (only when no image placeholder & not static) */}
                    {shouldFill && (
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
                    )}

                    {/* Placeholder image (image fields with a resolved asset) */}
                    {imageEl && (
                      <KonvaImage
                        image={imageEl}
                        width={field.width}
                        height={field.height}
                        listening={true}
                        onClick={(e) => handleFieldClick(e, field.id)}
                      />
                    )}

                    {/* Border-only rect when we skipped the fill but still want
                        the outline (static fields, or image fields with an
                        image — the image covers the interior, but we keep a
                        thin stroke so selection/type colour is visible). */}
                    {!shouldFill && (
                      <Rect
                        width={field.width}
                        height={field.height}
                        fill={undefined}
                        stroke={isSelected ? SELECTED_STROKE : colors.stroke}
                        strokeWidth={isSelected ? 2 / zoom : 1 / zoom}
                        cornerRadius={2 / zoom}
                        listening={true}
                        onClick={(e) => handleFieldClick(e, field.id)}
                      />
                    )}

                    {/* Auto-fit label — only when (a) we have text AND (b) no
                        image is being rendered (image covers the interior so
                        a label on top would be unreadable). */}
                    {label && !imageEl && labelFontSize > 0 && (
                      <Text
                        text={label}
                        x={innerPad}
                        y={innerPad}
                        fontSize={labelFontSize}
                        fontFamily="sans-serif"
                        fill={colors.text}
                        width={labelW}
                        height={labelH}
                        align="left"
                        verticalAlign="top"
                        wrap="word"
                        listening={false}
                      />
                    )}
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
      </div>

      {/* Page navigation bar */}
      {renderPageBar()}

      {/* Add page dialog */}
      {showAddPageDialog && (
        <AddPageDialog onClose={() => setShowAddPageDialog(false)} onAdd={handleAddPage} />
      )}
    </div>
  )
}
