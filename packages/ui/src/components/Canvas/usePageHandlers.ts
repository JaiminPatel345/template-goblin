/**
 * usePageHandlers — page management + onboarding file upload, extracted from
 * CanvasArea for separation of concerns. The element-creation popup lives in
 * its own hook (`useFieldCreationPopup`) so this file stays under the
 * 300-line cap (CLAUDE.md Hard Rule #11).
 */
import { useState, useCallback, useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { snapshotSameAsPrevious } from '../../utils/pageSnapshot.js'
import { type PageDefinition, type PageBackgroundType, type PageSize } from '@template-goblin/types'
import { useFieldCreationPopup } from './useFieldCreationPopup.js'

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

  const [showAddPageDialog, setShowAddPageDialog] = useState(false)
  // The Change Background dialog is global (uiStore) so the Toolbar
  // button — which lives outside CanvasArea — can open it without prop
  // drilling through the layout tree.
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
      // If the user onboarded via image there's a legacy background stored in
      // `backgroundDataUrl` and NO explicit entry in `pages[]`. The implicit
      // legacy occupies tab 1 in PageBar — so a newly-added page must take
      // the NEXT slot (index 1), otherwise it would sit at index 0 and hide
      // the legacy tab entirely. Clicking ✕ on the shadowed tab used to
      // trigger the "last page" reset and wipe both pages (GH #23).
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

  // ── Change background of the current page (#58) ────────────────────────

  /**
   * Replace the *current page's* background. Mirrors `handleAddPage`'s
   * branching on `bgType` but updates the existing page entry instead of
   * appending a new one. Also updates the legacy `backgroundDataUrl`
   * fields as a backstop for code paths that still consult them.
   *
   * Pre-#58 the BG button hit `setBackground` which writes only the legacy
   * fields, so multi-page templates (where the canvas reads from
   * `pageBackgroundDataUrls`) saw no change at all.
   */
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
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const bufReader = new FileReader()
          bufReader.onload = () => {
            updatePage(targetId, {
              backgroundType: 'image',
              backgroundColor: null,
              backgroundFilename: `backgrounds/${targetId}.png`,
              ...sized,
            })
            setPageBackground(targetId, dataUrl, bufReader.result as ArrayBuffer)
            // Backstop: pre-pages-schema saved templates (and the single-page
            // legacy preview path) still consult `backgroundDataUrl`. Keep
            // it in sync so neither path renders a stale image.
            setBackground(dataUrl, bufReader.result as ArrayBuffer)
          }
          bufReader.readAsArrayBuffer(bgFile)
        }
        reader.readAsDataURL(bgFile)
      }
    },
    [currentPageId, updatePage, setPageBackground, setBackground],
  )

  // ── Remove page ────────────────────────────────────────────────────────

  const handleRemovePage = useCallback(
    (pageId: string | null) => {
      // Mirror what PageBar renders: every explicit page gets a tab, plus
      // one implicit tab when no explicit page sits at index 0.
      const page0IsExplicit = pages.some((p) => p.index === 0)
      const visiblePageCount = pages.length + (page0IsExplicit ? 0 : 1)

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
