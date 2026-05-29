/**
 * Render-side coverage for `field.rotation` (#172).
 *
 * Asserts that `renderField` wraps the field's draw block in
 * `doc.save()` → `doc.rotate(angle, { origin: [cx, cy] })` → `doc.restore()`
 * when rotation is non-zero, and is a no-op transform otherwise.
 * Origin is the centre of the unrotated field rect so the canvas preview
 * (Fabric `centeredRotation: true`) and the PDF match pixel-for-pixel.
 */
import PDFDocument from 'pdfkit'
import type { InputJSON, LoadedTemplate, TemplateManifest } from '@template-goblin/types'
import { renderField } from '../../src/render/field.js'
import { makeManifest, staticText } from '../helpers/fixtures.js'

function loadedTemplate(manifest: TemplateManifest): LoadedTemplate {
  return {
    manifest,
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: new Map(),
    placeholders: new Map(),
    staticImages: new Map(),
  }
}

function emptyData(): InputJSON {
  return { texts: {}, images: {}, tables: {} }
}

describe('renderField — rotation transform (#172)', () => {
  // We spy on `rotate` (not `save` / `restore`) because PDFKit itself
  // calls save/restore internally during text rendering, which would
  // make the spies noisy. `rotate` is only called by OUR code path, so
  // its presence is a faithful proxy for the rotation envelope.
  it('rotation = 0 does NOT invoke rotate', () => {
    const field = staticText('t1', 'hello', { x: 100, y: 200, width: 80, height: 30 })
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const rotateSpy = jest.spyOn(doc, 'rotate')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, emptyData(), new Map(), template, { pageIndex: 0 }, new Map())
    expect(rotateSpy).not.toHaveBeenCalled()
    rotateSpy.mockRestore()
  })

  it('rotation undefined (legacy field) is treated as no rotation', () => {
    const field = staticText('t1', 'hello', { x: 100, y: 200, width: 80, height: 30 })
    delete (field as { rotation?: number | null }).rotation
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const rotateSpy = jest.spyOn(doc, 'rotate')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, emptyData(), new Map(), template, { pageIndex: 0 }, new Map())
    expect(rotateSpy).not.toHaveBeenCalled()
    rotateSpy.mockRestore()
  })

  it('rotation null is treated as no rotation', () => {
    const field = { ...staticText('t1', 'hello'), rotation: null }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const rotateSpy = jest.spyOn(doc, 'rotate')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, emptyData(), new Map(), template, { pageIndex: 0 }, new Map())
    expect(rotateSpy).not.toHaveBeenCalled()
    rotateSpy.mockRestore()
  })

  it('non-zero rotation invokes rotate exactly once around the rect centre', () => {
    const field = {
      ...staticText('t1', 'hello', { x: 100, y: 200, width: 80, height: 30 }),
      rotation: 45,
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const rotateSpy = jest.spyOn(doc, 'rotate')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, emptyData(), new Map(), template, { pageIndex: 0 }, new Map())
    expect(rotateSpy).toHaveBeenCalledTimes(1)
    // Centre of rect (100,200,80,30) is (140, 215).
    expect(rotateSpy).toHaveBeenCalledWith(45, { origin: [140, 215] })
    rotateSpy.mockRestore()
  })

  it('rotate fires BEFORE the field-content font set, link rect fires AFTER restore', () => {
    // Ordering test using the call sequence on a handful of spies. We
    // can't reliably observe save/restore in isolation (PDFKit calls
    // them internally), but `rotate` and `link` are unique to OUR
    // wrapper so their relative order pins the structure: rotate must
    // precede the field's font/draw, link must come after the field
    // restored (so the link rect is at page-axis-aligned coords).
    const field = {
      ...staticText('t1', 'hello', { x: 0, y: 0, width: 100, height: 50 }),
      rotation: 90,
      hyperlink: { mode: 'static' as const, url: 'https://example.com' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const calls: string[] = []
    jest.spyOn(doc, 'rotate').mockImplementation(() => {
      calls.push('rotate')
      return doc
    })
    jest.spyOn(doc, 'link').mockImplementation(() => {
      calls.push('link')
      return doc
    })
    const originalFont = doc.font.bind(doc)
    jest.spyOn(doc, 'font').mockImplementation((arg: unknown) => {
      calls.push('font')
      return originalFont(arg as string)
    })
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, emptyData(), new Map(), template, { pageIndex: 0 }, new Map())
    expect(calls.indexOf('rotate')).toBeGreaterThanOrEqual(0)
    expect(calls.indexOf('rotate')).toBeLessThan(calls.indexOf('font'))
    expect(calls.indexOf('font')).toBeLessThan(calls.indexOf('link'))
  })

  it('negative rotation is normalised into [0, 360) before doc.rotate', () => {
    // #172 follow-up: renderField normalises the angle so very large or
    // negative inputs don't lose precision in PDFKit's internal trig
    // (which would visibly desync the rotated content from where the UI
    // canvas drew it). -90° -> 270° here.
    const field = {
      ...staticText('t1', 'hello', { x: 10, y: 20, width: 100, height: 50 }),
      rotation: -90,
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const rotateSpy = jest.spyOn(doc, 'rotate')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, emptyData(), new Map(), template, { pageIndex: 0 }, new Map())
    expect(rotateSpy).toHaveBeenCalledWith(270, { origin: [60, 45] })
    rotateSpy.mockRestore()
  })

  it('huge rotation is normalised into [0, 360) before doc.rotate', () => {
    const field = {
      ...staticText('t1', 'hello', { x: 10, y: 20, width: 100, height: 50 }),
      rotation: 5612356213214654,
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const rotateSpy = jest.spyOn(doc, 'rotate')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, emptyData(), new Map(), template, { pageIndex: 0 }, new Map())
    expect(rotateSpy).toHaveBeenCalledTimes(1)
    const [angle] = rotateSpy.mock.calls[0] ?? []
    expect(angle).toBeGreaterThanOrEqual(0)
    expect(angle).toBeLessThan(360)
    rotateSpy.mockRestore()
  })

  it('hyperlink rect is drawn at the UNROTATED field bounds (v1 limitation)', () => {
    // PDF spec annotations are page-axis-aligned; the rect doesn't rotate
    // with the visual content. This pins the v1 behaviour so future
    // changes (e.g. rotated-AABB hit region) are deliberate.
    const field = {
      ...staticText('t1', 'hello', { x: 10, y: 20, width: 100, height: 50 }),
      rotation: 45,
      hyperlink: { mode: 'static' as const, url: 'https://example.com' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, emptyData(), new Map(), template, { pageIndex: 0 }, new Map())
    expect(linkSpy).toHaveBeenCalledWith(10, 20, 100, 50, 'https://example.com')
    linkSpy.mockRestore()
  })
})
