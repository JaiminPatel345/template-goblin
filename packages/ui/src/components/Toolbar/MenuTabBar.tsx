import { useEffect, useRef, useState } from 'react'
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

/**
 * Inline template-name editor (#144). Click the title to edit; Enter or
 * blur commits, Esc reverts. Empty strings fall back to the default
 * 'Untitled Template' so a save always has a usable filename.
 */
function TemplateNameField() {
  const name = useTemplateStore((s) => s.meta.name)
  const setMeta = useTemplateStore((s) => s.setMeta)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(name)
  }, [name, editing])

  function commit() {
    const trimmed = draft.trim()
    setMeta({ name: trimmed.length > 0 ? trimmed : 'Untitled Template' })
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        data-testid="template-name-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') {
            setDraft(name)
            setEditing(false)
          }
        }}
        onBlur={commit}
        style={{
          height: 'var(--control-height-md)',
          padding: '0 8px',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-weight-medium)',
          minWidth: 180,
          outline: 'none',
        }}
        maxLength={80}
      />
    )
  }

  return (
    <button
      type="button"
      data-testid="template-name-button"
      onClick={() => setEditing(true)}
      title="Click to rename"
      style={{
        height: 'var(--control-height-md)',
        padding: '0 10px',
        background: 'transparent',
        border: '1px dashed transparent',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-secondary)',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-weight-medium)',
        cursor: 'text',
        whiteSpace: 'nowrap',
        maxWidth: 220,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
      }}
    >
      {name || 'Untitled Template'}
    </button>
  )
}

export function MenuTabBar() {
  const activeTab = useUiStore((s) => s.activeMenuTab)
  const setActiveMenuTab = useUiStore((s) => s.setActiveMenuTab)
  const ribbonCollapsed = useUiStore((s) => s.ribbonCollapsed)
  const setRibbonCollapsed = useUiStore((s) => s.setRibbonCollapsed)

  // QA BUG-16: Escape collapses the ribbon when no other dismissible
  // surface (dialog, popover, etc.) is in front. We listen on `window`
  // and check for visible dialogs first — if any are open they handle
  // their own Escape and we no-op.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const dialogOpen = document.querySelector('[data-testid$="-dialog"], [role="dialog"]')
      if (dialogOpen) return
      if (!ribbonCollapsed) setRibbonCollapsed(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ribbonCollapsed, setRibbonCollapsed])

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
      const result = await saveTemplate()
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1400)
      // QA BUG-09: previously the silently-dropped fields just hit
      // console.warn — invisible to non-technical users. Surface the
      // count + ids so they can recover (Convert to new format, then
      // re-save).
      if (result.droppedFieldIds.length > 0) {
        const n = result.droppedFieldIds.length
        alert(
          `Saved — but ${n} field${n === 1 ? '' : 's'} could not be written to the .tgbl file because they're in an outdated format. ` +
            `Open each affected field in the right panel and click 'Convert to new format', then save again.\n\n` +
            `Affected field id${n === 1 ? '' : 's'}: ${result.droppedFieldIds.join(', ')}`,
        )
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    }
  }

  // Pinned tool: neutral button with the field-type colour applied to
  // the icon only — same visual idiom as Figma's left-rail tool buttons.
  // Active state uses the standard ribbon active treatment so the
  // pinned tools read as part of the toolbar system rather than
  // candy-coloured outliers.
  function PinnedTool({
    tool,
    label,
    icon,
    colour,
  }: {
    tool: 'addText' | 'addImage' | 'addLoop'
    label: string
    icon: React.ReactNode
    colour: { stroke: string }
  }) {
    const fieldType = tool === 'addText' ? 'text' : tool === 'addImage' ? 'image' : 'table'
    const isActive = activeTool === tool || selectedFieldTypes.has(fieldType)
    return (
      <RibbonButton
        label={label}
        icon={<span style={{ color: colour.stroke, display: 'inline-flex' }}>{icon}</span>}
        onClick={() => setActiveTool(activeTool === tool ? 'select' : tool)}
        disabled={locked || !hasBackground}
        title={`Insert ${label.toLowerCase()}`}
        testid={`toolbar-tool-${fieldType}`}
        variant={isActive ? 'toggle' : 'default'}
        active={isActive}
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
        gap: 4,
        padding: '6px 12px',
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

      {/* QA BUG-15: an inline template-name editor lives between the menu
       *  tabs and the pinned tools. Click → edit; Enter / blur → commit;
       *  Esc → cancel. Empty → falls back to 'Untitled Template'. */}
      <TemplateNameField />

      <MenuSeparator />

      {/* Pinned insert tools — always one click away */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
          title="Preview template"
          variant={showPreview ? 'toggle' : 'default'}
          active={showPreview}
          testid="toolbar-preview"
        />
        <RibbonButton
          icon={<SaveIcon />}
          label={savedFlash ? 'Saved!' : 'Save'}
          onClick={handleSave}
          title="Save template (Ctrl+S)"
          variant="success"
          testid="toolbar-save"
        />
        <RibbonButton
          icon={locked ? <LockedIcon /> : <UnlockedIcon />}
          label={locked ? 'Unlock' : 'Lock'}
          onClick={() => setLocked(!locked)}
          // UX-05: a richer tooltip telling the user exactly what
          // Lock does, so they're not surprised by the modal-style
          // overlay that lands the moment they click it.
          title={
            locked
              ? 'Click to unlock — restores all editing controls.'
              : 'Lock template — disables every edit until you click Unlock. Useful before exporting to PDF.'
          }
          variant={locked ? 'toggle' : 'default'}
          active={locked}
          testid="toolbar-lock"
        />
      </div>
    </div>
  )
}
