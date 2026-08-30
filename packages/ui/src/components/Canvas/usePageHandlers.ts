import { useState, useCallback, useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { findDuplicateBackground, readFileAsDataUrlAndBuffer } from '../../utils/imageHash.js'
import { snapshotSameAsPrevious } from '../../utils/pageSnapshot.js'
import { type PageDefinition, type PageBackgroundType, type PageSize } from '@template-goblin/types'
import { useFieldCreationPopup } from './useFieldCreationPopup.js'
import { useDialogs } from '../Dialogs/index.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

let pageIdCounter = 0
function generatePageId(): string {
  pageIdCounter++
  return `page-${Date.now()}-${pageIdCounter}`
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePageHandlers() {
  const addPage = useTemplateStore((s) => s.addPage)
  const removePage = useTemplateStore((s) => s.removePage)
  const updatePage = useTemplateStore((s) => s.updatePage)
  const setPageBackground = useTemplateStore((s) => s.setPageBackground)
  const setBackground = useTemplateStore((s) => s.setBackground)
  const reset = useTemplateStore((s) => s.reset)
  const pages = useTemplateStore((s) => s.pages)
  const pageBackgroundDataUrls = useTemplateStore((s) => s.pageBackgroundDataUrls)
  const pageBackgroundBuffers = useTemplateStore((s) => s.pageBackgroundBuffers)

  const clearSelection = useUiStore((s) => s.clearSelection)
  const setCurrentPage = useUiStore((s) => s.setCurrentPage)
  const setPendingBackground = useUiStore((s) => s.setPendingBackground)
  const setShowPageSizeDialog = useUiStore((s) => s.setShowPageSizeDialog)
  const currentPageId = useUiStore((s) => s.currentPageId)
  const { confirm: showConfirm } = useDialogs()

  const [showAddPageDialog, setShowAddPageDialog] = useState(false)
  const showChangeBgDialog = useUiStore((s) => s.showChangeBgDialog)
  const setShowChangeBgDialog = useUiStore((s) => s.setShowChangeBgDialog)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { pendingDraft, setPendingDraft, handlePopupConfirm, handlePopupCancel } =
    useFieldCreationPopup()

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
    (
      bgType: PageBackgroundType,
      size: { pageSize: PageSize; width: number; height: number },
      bgColor?: string,
      bgFile?: File,
    ) => {
      setShowAddPageDialog(false)
      const pageId = generatePageId()
      const legacyBg = useTemplateStore.getState().backgroundDataUrl
      const hasLegacyPage0 = legacyBg !== null && !pages.some((p) => p.index === 0)
      const index = pages.length + (hasLegacyPage0 ? 1 : 0)

      const sized = { width: size.width, height: size.height, pageSize: size.pageSize }

      if (bgType === 'inherit') {
        const { page: snap, sourceId } = snapshotSameAsPrevious(pages, pageId, index)
        const snapWithSize: PageDefinition = { ...snap, ...sized }
        if (snap.backgroundType === 'image' && sourceId) {
          const prevDataUrl = pageBackgroundDataUrls.get(sourceId) ?? null
          const prevBuffer = pageBackgroundBuffers.get(sourceId) ?? null
          if (prevDataUrl && prevBuffer) {
            addPage(snapWithSize, prevDataUrl, prevBuffer.slice(0))
          } else {
            addPage(snapWithSize)
          }
        } else {
          addPage(snapWithSize)
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
        ...sized,
      }

      if (bgType === 'image' && bgFile) {
        readFileAsDataUrlAndBuffer(bgFile).then(async ({ dataUrl, buffer }) => {
          const match = await findDuplicateBackground(
            buffer,
            pages,
            pageBackgroundBuffers,
            pageBackgroundDataUrls,
          )
          if (match) {
            addPage({ ...page, backgroundFilename: match.filename }, match.dataUrl, match.buffer)
          } else {
            addPage(page, dataUrl, buffer)
          }
          setCurrentPage(pageId)
        })
      } else {
        addPage(page)
        setCurrentPage(pageId)
      }
    },
    [pages, pageBackgroundDataUrls, pageBackgroundBuffers, addPage, setCurrentPage],
  )

  // ── Change background of the current page (#58) ────────────────────────

  const handleChangeBackground = useCallback(
    (
      bgType: PageBackgroundType,
      size: { pageSize: PageSize; width: number; height: number },
      bgColor?: string,
      bgFile?: File,
    ) => {
      setShowChangeBgDialog(false)

      const allPages = useTemplateStore.getState().pages
      const targetId =
        currentPageId !== null && allPages.some((p) => p.id === currentPageId)
          ? currentPageId
          : (allPages.find((p) => p.index === 0)?.id ?? null)
      if (!targetId) return

      const sized = { width: size.width, height: size.height, pageSize: size.pageSize }

      if (bgType === 'inherit') {
        updatePage(targetId, {
          backgroundType: 'inherit',
          backgroundColor: null,
          backgroundFilename: null,
          ...sized,
        })
        return
      }

      if (bgType === 'color') {
        updatePage(targetId, {
          backgroundType: 'color',
          backgroundColor: bgColor ?? '#ffffff',
          backgroundFilename: null,
          ...sized,
        })
        return
      }

      if (bgType === 'image' && bgFile) {
        readFileAsDataUrlAndBuffer(bgFile).then(async ({ dataUrl, buffer }) => {
          const match = await findDuplicateBackground(
            buffer,
            allPages,
            pageBackgroundBuffers,
            pageBackgroundDataUrls,
          )
          if (match) {
            updatePage(targetId, {
              backgroundType: 'image',
              backgroundColor: null,
              backgroundFilename: match.filename,
              ...sized,
            })
            setPageBackground(targetId, match.dataUrl, match.buffer)
            setBackground(match.dataUrl, match.buffer)
          } else {
            updatePage(targetId, {
              backgroundType: 'image',
              backgroundColor: null,
              backgroundFilename: `backgrounds/${targetId}.png`,
              ...sized,
            })
            setPageBackground(targetId, dataUrl, buffer)
            setBackground(dataUrl, buffer)
          }
        })
      }
    },
    [currentPageId, updatePage, setPageBackground, setBackground],
  )

  const handleRemovePage = useCallback(
    async (pageId: string | null) => {
      const page0IsExplicit = pages.some((p) => p.index === 0)
      const visiblePageCount = pages.length + (page0IsExplicit ? 0 : 1)

      if (visiblePageCount <= 1) {
        const ok = await showConfirm({
          title: 'Delete the last page?',
          message: 'This will clear all fields and settings. The template returns to onboarding.',
          confirmLabel: 'Delete page',
          destructive: true,
        })
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
      const nextPages = useTemplateStore.getState().pages
      const nextFirst = [...nextPages].sort((a, b) => a.index - b.index)[0]
      setCurrentPage(nextFirst?.id ?? null)
      clearSelection()
    },
    [pages, reset, removePage, setCurrentPage, clearSelection, showConfirm],
  )

  return {
    // State
    showAddPageDialog,
    setShowAddPageDialog,
    showChangeBgDialog,
    setShowChangeBgDialog,
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
    handleChangeBackground,
    handleRemovePage,
  }
}
