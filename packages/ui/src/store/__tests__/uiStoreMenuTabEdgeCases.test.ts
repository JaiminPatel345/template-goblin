import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../uiStore.js'

describe('uiStore — navbar menu tab & grid edge cases', () => {
  beforeEach(() => {
    useUiStore.setState({
      activeMenuTab: 'file',
      ribbonCollapsed: false,
      showGrid: false,
    })
  })

  it('defaults showGrid to false for new templates', () => {
    expect(useUiStore.getState().showGrid).toBe(false)
  })

  it('toggling showGrid flips between true and false', () => {
    useUiStore.getState().setShowGrid(true)
    expect(useUiStore.getState().showGrid).toBe(true)

    useUiStore.getState().setShowGrid(false)
    expect(useUiStore.getState().showGrid).toBe(false)
  })

  it('defaults activeMenuTab to "file" and ribbonCollapsed to false on start', () => {
    const s = useUiStore.getState()
    expect(s.activeMenuTab).toBe('file')
    expect(s.ribbonCollapsed).toBe(false)
  })

  it('clicking active tab ("file") collapses ribbon and sets activeMenuTab to null', () => {
    useUiStore.getState().setActiveMenuTab('file')
    const s = useUiStore.getState()
    expect(s.activeMenuTab).toBeNull()
    expect(s.ribbonCollapsed).toBe(true)
  })

  it('clicking a tab when activeMenuTab is null expands ribbon and sets activeMenuTab to that tab', () => {
    useUiStore.setState({ activeMenuTab: null, ribbonCollapsed: true })

    useUiStore.getState().setActiveMenuTab('insert')
    const s = useUiStore.getState()
    expect(s.activeMenuTab).toBe('insert')
    expect(s.ribbonCollapsed).toBe(false)
  })

  it('clicking an inactive tab when ribbon is open switches to the new tab', () => {
    useUiStore.setState({ activeMenuTab: 'file', ribbonCollapsed: false })

    useUiStore.getState().setActiveMenuTab('format')
    const s = useUiStore.getState()
    expect(s.activeMenuTab).toBe('format')
    expect(s.ribbonCollapsed).toBe(false)
  })

  it('setRibbonCollapsed(true) sets activeMenuTab to null', () => {
    useUiStore.setState({ activeMenuTab: 'edit', ribbonCollapsed: false })

    useUiStore.getState().setRibbonCollapsed(true)
    const s = useUiStore.getState()
    expect(s.activeMenuTab).toBeNull()
    expect(s.ribbonCollapsed).toBe(true)
  })

  it('setRibbonCollapsed(false) when activeMenuTab is null defaults activeMenuTab back to "file"', () => {
    useUiStore.setState({ activeMenuTab: null, ribbonCollapsed: true })

    useUiStore.getState().setRibbonCollapsed(false)
    const s = useUiStore.getState()
    expect(s.activeMenuTab).toBe('file')
    expect(s.ribbonCollapsed).toBe(false)
  })
})
