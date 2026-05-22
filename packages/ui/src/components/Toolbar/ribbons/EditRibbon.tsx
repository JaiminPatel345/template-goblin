import { useTemplateStore } from '../../../store/templateStore.js'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'
import { UndoIcon, RedoIcon } from '../icons.js'

/**
 * Edit ribbon (#128). Undo / Redo today; placeholder slots for Copy /
 * Paste / Delete come later as field-clipboard support lands.
 */
export function EditRibbon() {
  const canUndo = useTemplateStore((s) => s.canUndo())
  const canRedo = useTemplateStore((s) => s.canRedo())
  const undo = useTemplateStore((s) => s.undo)
  const redo = useTemplateStore((s) => s.redo)

  return (
    <div style={{ display: 'flex' }}>
      <RibbonGroup label="History">
        <RibbonButton
          icon={<UndoIcon />}
          label="Undo"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          testid="ribbon-undo"
        />
        <RibbonButton
          icon={<RedoIcon />}
          label="Redo"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          testid="ribbon-redo"
        />
      </RibbonGroup>
    </div>
  )
}
