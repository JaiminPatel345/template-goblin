import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Shared popover positioning + dismiss logic for swatch/dial-style triggers
 * (ColorPickerPopover, RotationControl). Positions a fixed popover near the
 * trigger in viewport coords (so a sidebar's overflow can't clip it) and
 * closes it on outside-click / Escape. Extracted for reuse (Hard Rule #11).
 */
export function usePopoverAnchor(
  open: boolean,
  setOpen: (open: boolean) => void,
  size: { width: number; height: number } = { width: 220, height: 320 },
) {
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return
    const r = wrapperRef.current.getBoundingClientRect()
    const left = Math.min(window.innerWidth - size.width - 8, Math.max(8, r.right - size.width))
    const top = Math.min(window.innerHeight - size.height - 8, r.bottom + 4)
    setPosition({ top, left })
  }, [open, size.width, size.height])

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node | null
      if (!t) return
      if (popoverRef.current?.contains(t)) return
      if (wrapperRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  return { wrapperRef, popoverRef, position }
}
