import { useEffect, useCallback } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'

export function ContextMenu() {
  const contextMenu = useUiStore((s) => s.contextMenu)
  const setContextMenu = useUiStore((s) => s.setContextMenu)
  const bringForward = useTemplateStore((s) => s.bringForward)
  const sendBackward = useTemplateStore((s) => s.sendBackward)
  const bringToFront = useTemplateStore((s) => s.bringToFront)
  const sendToBack = useTemplateStore((s) => s.sendToBack)
  const duplicateField = useTemplateStore((s) => s.duplicateField)
  const removeField = useTemplateStore((s) => s.removeField)

  const close = useCallback(() => {
    setContextMenu(null)
  }, [setContextMenu])

  useEffect(() => {
    if (!contextMenu) return

    function handleClickOutside() {
      close()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu, close])

  if (!contextMenu) return null

  const { x, y, fieldId } = contextMenu

  function handleAction(action: () => void) {
    action()
    close()
  }

  return (
    <div
      className="tg-context-menu"
      style={{ left: x, top: y, position: 'fixed' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="tg-context-menu-item"
        onClick={() => handleAction(() => bringForward(fieldId))}
      >
        Bring Forward
      </div>
      <div
        className="tg-context-menu-item"
        onClick={() => handleAction(() => sendBackward(fieldId))}
      >
        Send Backward
      </div>
      <div
        className="tg-context-menu-item"
        onClick={() => handleAction(() => bringToFront(fieldId))}
      >
        Bring to Front
      </div>
      <div className="tg-context-menu-item" onClick={() => handleAction(() => sendToBack(fieldId))}>
        Send to Back
      </div>
      <div className="tg-context-menu-divider" />
      <div
        className="tg-context-menu-item"
        onClick={() => handleAction(() => duplicateField(fieldId))}
      >
        Duplicate
      </div>
      <div
        className="tg-context-menu-item"
        onClick={() => handleAction(() => removeField(fieldId))}
      >
        Delete
      </div>
    </div>
  )
}
