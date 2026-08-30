import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '../templateStore.js'

describe('Page background change isolation', () => {
  beforeEach(() => {
    useTemplateStore.getState().reset()
  })

  it('changing background on page 0 only modifies page 0 and leaves page 1 untouched', () => {
    const store = useTemplateStore.getState()
    // Add page 1 at index 1
    store.addPage({
      id: 'page-1',
      index: 1,
      backgroundType: 'color',
      backgroundColor: '#00ff00',
      backgroundFilename: null,
      width: 595,
      height: 842,
      pageSize: 'A4',
    })

    expect(useTemplateStore.getState().pages).toHaveLength(2)
    expect(useTemplateStore.getState().pages[0]!.backgroundColor).toBe('#ffffff')
    expect(useTemplateStore.getState().pages[1]!.backgroundColor).toBe('#00ff00')

    // Change background on page 0 to red
    useTemplateStore.getState().updatePage('page-0-default', {
      backgroundType: 'color',
      backgroundColor: '#ff0000',
    })

    const updatedPages = useTemplateStore.getState().pages
    expect(updatedPages[0]!.backgroundColor).toBe('#ff0000') // Page 0 changed
    expect(updatedPages[1]!.backgroundColor).toBe('#00ff00') // Page 1 untouched!
  })

  it('changing background on page 1 only modifies page 1 and leaves page 0 untouched', () => {
    const store = useTemplateStore.getState()
    store.addPage({
      id: 'page-1',
      index: 1,
      backgroundType: 'color',
      backgroundColor: '#00ff00',
      backgroundFilename: null,
      width: 595,
      height: 842,
      pageSize: 'A4',
    })

    // Change background on page 1 to blue
    useTemplateStore.getState().updatePage('page-1', {
      backgroundType: 'color',
      backgroundColor: '#0000ff',
    })

    const updatedPages = useTemplateStore.getState().pages
    expect(updatedPages[0]!.backgroundColor).toBe('#ffffff') // Page 0 untouched!
    expect(updatedPages[1]!.backgroundColor).toBe('#0000ff') // Page 1 changed!
  })
})
