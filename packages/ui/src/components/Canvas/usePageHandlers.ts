/**
 * usePageHandlers — page management, file upload, and element-creation popup
 * logic extracted from CanvasArea for separation of concerns.
 */
import { useState, useCallback, useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { createDefaultField } from '../../utils/defaults.js'
import { snapshotSameAsPrevious } from '../../utils/pageSnapshot.js'
import type { FieldDefinition, PageDefinition, PageBackgroundType } from '@template-goblin/types'
import type { FieldCreationDraft, SourceInputs } from './FieldCreationPopup.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

let pageIdCounter = 0
function generatePageId(): string {
  pageIdCounter++
  return `page-${Date.now()}-${pageIdCounter}`
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePageHandlers() {
  const addField = useTemplateStore((s) => s.addField)
  const addPage = useTemplateStore((s) => s.addPage)
  const removePage = useTemplateStore((s) => s.removePage)
  const reset = useTemplateStore((s) => s.reset)
  const pages = useTemplateStore((s) => s.pages)
  const pageBackgroundDataUrls = useTemplateStore((s) => s.pageBackgroundDataUrls)
  const pageBackgroundBuffers = useTemplateStore((s) => s.pageBackgroundBuffers)

  const selectField = useUiStore((s) => s.selectField)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const setCurrentPage = useUiStore((s) => s.setCurrentPage)
  const setPendingBackground = useUiStore((s) => s.setPendingBackground)
  const setShowPageSizeDialog = useUiStore((s) => s.setShowPageSizeDialog)

  const [showAddPageDialog, setShowAddPageDialog] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<FieldCreationDraft | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Element-creation popup ─────────────────────────────────────────────

  const handlePopupConfirm = useCallback(
    (label: string, source: SourceInputs) => {
      if (!pendingDraft) return
      const base = createDefaultField(pendingDraft.type, {
        id: '',
        groupId: pendingDraft.groupId,
        pageId: pendingDraft.pageId,
        x: pendingDraft.x,
        y: pendingDraft.y,
        width: pendingDraft.width,
        height: pendingDraft.height,
        zIndex: pendingDraft.zIndex,
      })

      if (source.mode === 'static' && source.image) {
        useTemplateStore
          .getState()
          .addStaticImage(source.image.filename, source.image.dataUrl, source.image.buffer)
      }

      const withUserInput: FieldDefinition = (() => {
        if (source.mode === 'static') {
          if (base.type === 'text') {
            return { ...base, label, source: { mode: 'static', value: source.value } }
          }
          if (base.type === 'image') {
            const filename = source.image?.filename ?? ''
            return { ...base, label, source: { mode: 'static', value: { filename } } }
          }
          return { ...base, label, source: { mode: 'static', value: [] } }
        }
        const ph = base.type === 'text' ? source.placeholder || null : null
        return {
          ...base,
          label,
          source: {
            mode: 'dynamic',
            jsonKey: source.jsonKey,
            required: source.required,
            placeholder: ph as never,
          },
        } as FieldDefinition
      })()

      addField(withUserInput)
      setTimeout(() => {
        const currentFields = useTemplateStore.getState().fields
        const newField = currentFields[currentFields.length - 1]
        if (newField) selectField(newField.id)
      }, 0)
      setPendingDraft(null)
    },
    [pendingDraft, addField, selectField],
  )

  const handlePopupCancel = useCallback(() => setPendingDraft(null), [])

  // ── File upload ────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    (file: File) => {
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
    },
    [setPendingBackground, setShowPageSizeDialog],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) handleFileUpload(file)
    },
    [handleFileUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileUpload(file)
      e.target.value = ''
    },
    [handleFileUpload],
  )

  // ── Add page ───────────────────────────────────────────────────────────

  const handleAddPage = useCallback(
    (bgType: PageBackgroundType, bgColor?: string, bgFile?: File) => {
      setShowAddPageDialog(false)
      const pageId = generatePageId()
      const index = pages.length

      if (bgType === 'inherit') {
        const { page: snap, sourceId } = snapshotSameAsPrevious(pages, pageId, index)
        if (snap.backgroundType === 'image' && sourceId) {
          const prevDataUrl = pageBackgroundDataUrls.get(sourceId) ?? null
          const prevBuffer = pageBackgroundBuffers.get(sourceId) ?? null
          if (prevDataUrl && prevBuffer) {
            addPage(snap, prevDataUrl, prevBuffer.slice(0))
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
            addPage(page, dataUrl, bufReader.result as ArrayBuffer)
            setCurrentPage(pageId)
          }
          bufReader.readAsArrayBuffer(bgFile)
        }
        reader.readAsDataURL(bgFile)
      } else {
        addPage(page)
        setCurrentPage(pageId)
      }
    },
    [pages, pageBackgroundDataUrls, pageBackgroundBuffers, addPage, setCurrentPage],
  )

  // ── Remove page ────────────────────────────────────────────────────────

  const handleRemovePage = useCallback(
    (pageId: string | null) => {
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

      if (pageId === null) {
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
      // After the reducer runs, land on whichever page ended up at index 0
      // instead of dropping back to null. Leaving `currentPageId` null when
      // explicit pages remain is what caused GH #23 — the canvas
      // background-resolver had no page to look at and rendered blank,
      // making it look like the remaining page had also been closed.
      const nextPages = useTemplateStore.getState().pages
      const nextFirst = [...nextPages].sort((a, b) => a.index - b.index)[0]
      setCurrentPage(nextFirst?.id ?? null)
      clearSelection()
    },
    [pages, reset, removePage, setCurrentPage, clearSelection],
  )

  return {
    // State
    showAddPageDialog,
    setShowAddPageDialog,
    isDragOver,
    fileInputRef,
    pendingDraft,
    setPendingDraft,
    // Handlers
    handlePopupConfirm,
    handlePopupCancel,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleInputChange,
    handleAddPage,
    handleRemovePage,
  }
}
