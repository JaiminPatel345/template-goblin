import { useUiStore } from '../../../store/uiStore.js'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { RibbonButton } from '../primitives/RibbonButton.js'
import { MoonIcon, SunIcon, ZoomInIcon, ZoomOutIcon, PanelLeftIcon } from '../icons.js'

/**
 * View ribbon (#128). Display preferences: panel visibility, snap to
 * grid, zoom level, theme toggle. Pulls the previously-scattered
 * controls (showGrid, zoom, theme, panels) into one logical home.
 */
export function ViewRibbon() {
  const showGrid = useUiStore((s) => s.showGrid)
  const setShowGrid = useUiStore((s) => s.setShowGrid)
  const zoom = useUiStore((s) => s.zoom)
  const zoomIn = useUiStore((s) => s.zoomIn)
  const zoomOut = useUiStore((s) => s.zoomOut)
  const resetZoom = useUiStore((s) => s.resetZoom)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const showLeftPanel = useUiStore((s) => s.showLeftPanel)
  const setShowLeftPanel = useUiStore((s) => s.setShowLeftPanel)
  const showRightPanel = useUiStore((s) => s.showRightPanel)
  const setShowRightPanel = useUiStore((s) => s.setShowRightPanel)

  return (
    <div style={{ display: 'flex' }}>
      <RibbonGroup label="Panels">
        <RibbonButton
          icon={<PanelLeftIcon />}
          label="Left"
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          active={showLeftPanel}
          variant="toggle"
          title={showLeftPanel ? 'Hide properties panel' : 'Show properties panel'}
          testid="toolbar-toggle-left-panel"
        />
        <RibbonButton
          icon={<PanelLeftIcon />}
          label="Right"
          onClick={() => setShowRightPanel(!showRightPanel)}
          active={showRightPanel}
          variant="toggle"
          title={showRightPanel ? 'Hide structure panel' : 'Show structure panel'}
          testid="toolbar-toggle-right-panel"
        />
      </RibbonGroup>
      <RibbonGroup label="Grid">
        <RibbonButton
          label="Snap"
          onClick={() => setShowGrid(!showGrid)}
          active={showGrid}
          variant="toggle"
          title="Snap fields to a regular grid"
          testid="ribbon-snap"
        />
      </RibbonGroup>
      <RibbonGroup label="Zoom">
        <RibbonButton
          icon={<ZoomOutIcon />}
          onClick={zoomOut}
          compact
          title="Zoom out"
          testid="ribbon-zoom-out"
          ariaLabel="Zoom out"
        />
        <RibbonButton
          label={`${Math.round(zoom * 100)}%`}
          onClick={resetZoom}
          compact
          title="Reset zoom to 100%"
          testid="ribbon-zoom-reset"
        />
        <RibbonButton
          icon={<ZoomInIcon />}
          onClick={zoomIn}
          compact
          title="Zoom in"
          testid="ribbon-zoom-in"
          ariaLabel="Zoom in"
        />
      </RibbonGroup>
      <RibbonGroup label="Appearance">
        <RibbonButton
          icon={theme === 'light' ? <MoonIcon /> : <SunIcon />}
          label={theme === 'light' ? 'Dark' : 'Light'}
          onClick={toggleTheme}
          title="Toggle theme"
          testid="ribbon-theme"
        />
      </RibbonGroup>
    </div>
  )
}
