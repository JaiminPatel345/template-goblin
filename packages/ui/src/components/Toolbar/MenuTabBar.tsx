import { useState } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { saveTemplate } from '../../utils/saveOpen.js'
import { FIELD_COLORS } from '../../theme/fieldColors.js'
import { MenuButton, MenuSeparator } from './primitives/MenuButton.js'
import { RibbonButton } from './primitives/RibbonButton.js'
import {
  TextIcon,
  ImageIcon,
  TableIcon,
  PreviewIcon,
  SaveIcon,
  LockedIcon,
  UnlockedIcon,
} from './icons.js'

/**
 * Row-1 of the new top bar (#128). Three logical zones, separated by
 * subtle dividers:
 *
 *   [ File · Edit · Insert · Format · View · Help ]   ← tab strip
 *           …                                          ← spacer
 *   [ Text · Image · Table ]                           ← pinned tools
 *           …                                          ← spacer
 *   [ Preview · Save · Lock ]                          ← primary CTAs
 *
 * The tab strip drives `uiStore.activeMenuTab`; the ribbon below picks
 * the matching `*Ribbon.tsx`. Pinned tools mirror what Word puts on
 * Home — always one click away no matter which tab is active. The CTAs
 * stay at the far right where every user expects Save to live.
 */
type MenuTab = 'file' | 'edit' | 'insert' | 'format' | 'view' | 'help'

const TABS: Array<{ id: MenuTab; label: string }> = [
  { id: 'file', label: 'File' },
  { id: 'edit', label: 'Edit' },
  { id: 'insert', label: 'Insert' },
  { id: 'format', label: 'Format' },
  { id: 'view', label: 'View' },
  { id: 'help', label: 'Help' },
]

export function MenuTabBar() {
  const activeTab = useUiStore((s) => s.activeMenuTab)
  const setActiveMenuTab = useUiStore((s) => s.setActiveMenuTab)

  const meta = useTemplateStore((s) => s.meta)
  const locked = meta.locked
  const setLocked = useTemplateStore((s) => s.setLocked)
  const activeTool = useUiStore((s) => s.activeTool)
  const setActiveTool = useUiStore((s) => s.setActiveTool)
  const selectedFieldIds = useUiStore((s) => s.selectedFieldIds)
  const fields = useTemplateStore((s) => s.fields)
  const hasBackground = useTemplateStore(
    (s) =>
      s.backgroundDataUrl !== null ||
      s.pages.some(
        (p) => p.index === 0 && (p.backgroundType === 'color' || p.backgroundType === 'image'),
      ),
  )
  const showPreview = useUiStore((s) => s.showPreview)
  const setShowPreview = useUiStore((s) => s.setShowPreview)

  const selectedFieldTypes = new Set(
    fields.filter((f) => selectedFieldIds.includes(f.id)).map((f) => f.type),
  )

  const [savedFlash, setSavedFlash] = useState(false)
  async function handleSave() {
    try {
      await saveTemplate()
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1400)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    }
  }

  // Type-coloured pinned tool button. Reuses the field-colour theme so
  // the visual match between toolbar button and on-canvas field stays
  // consistent. Active when the tool is selected OR a matching field is
  // currently in the selection — the existing UX cue from the old bar.
  function PinnedTool({
    tool,
    label,
    icon,
    colour,
  }: {
    tool: 'addText' | 'addImage' | 'addLoop'
    label: string
    icon: React.ReactNode
    colour: { stroke: string; toolbarBg: string; toolbarFg: string }
  }) {
    const fieldType = tool === 'addText' ? 'text' : tool === 'addImage' ? 'image' : 'table'
    const isActive = activeTool === tool || selectedFieldTypes.has(fieldType)
    return (
      <RibbonButton
        label={label}
        icon={icon}
        onClick={() => setActiveTool(activeTool === tool ? 'select' : tool)}
        disabled={locked || !hasBackground}
        compact
        title={`Insert ${label.toLowerCase()}`}
        testid={`toolbar-tool-${fieldType}`}
        style={
          isActive
            ? { background: colour.stroke, color: '#fff', borderColor: colour.stroke }
            : {
                background: colour.toolbarBg,
                color: colour.toolbarFg,
                borderColor: colour.stroke,
                borderStyle: 'solid',
                borderWidth: 1,
              }
        }
      />
    )
  }

  return (
    <div
      role="menubar"
      aria-label="Main menu"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '6px 10px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      {/* Tab strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {TABS.map((t) => (
          <MenuButton
            key={t.id}
            label={t.label}
            active={activeTab === t.id}
            onClick={() => setActiveMenuTab(t.id)}
            testid={`menu-tab-${t.id}`}
          />
        ))}
      </div>

      <MenuSeparator />

      {/* Pinned insert tools — always one click away */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PinnedTool tool="addText" label="Text" icon={<TextIcon />} colour={FIELD_COLORS.text} />
        <PinnedTool
          tool="addImage"
          label="Image"
          icon={<ImageIcon />}
          colour={FIELD_COLORS.image}
        />
        <PinnedTool tool="addLoop" label="Table" icon={<TableIcon />} colour={FIELD_COLORS.table} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Primary CTAs — far right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <RibbonButton
          icon={<PreviewIcon />}
          label="Preview"
          onClick={() => setShowPreview(!showPreview)}
          disabled={!hasBackground}
          compact
          title="Preview template"
          variant={showPreview ? 'toggle' : 'default'}
          active={showPreview}
          testid="toolbar-preview"
        />
        <RibbonButton
          icon={<SaveIcon />}
          label={savedFlash ? 'Saved!' : 'Save'}
          onClick={handleSave}
          compact
          title="Save template (Ctrl+S)"
          variant="success"
          testid="toolbar-save"
        />
        <RibbonButton
          icon={locked ? <LockedIcon /> : <UnlockedIcon />}
          label={locked ? 'Unlock' : 'Lock'}
          onClick={() => setLocked(!locked)}
          compact
          title={locked ? 'Unlock template' : 'Lock template'}
          variant={locked ? 'toggle' : 'default'}
          active={locked}
          testid="toolbar-lock"
        />
      </div>
    </div>
  )
}
