/**
 * Render-side coverage for `field.hyperlink` (#87).
 *
 * Spies on `doc.link()` to assert the renderer calls it once per linked
 * field with the field's bounding rect, that static and dynamic both
 * resolve correctly, that empty / missing dynamic values produce no
 * link, and that an unlinked field never calls `doc.link`.
 */
import PDFDocument from 'pdfkit'
import type {
  FieldDefinition,
  InputJSON,
  LoadedTemplate,
  TemplateManifest,
} from '@template-goblin/types'
import { renderField } from '../../src/render/field.js'
import { dynText, makeManifest, staticImage, staticTable, staticText } from '../helpers/fixtures.js'

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

function callRender(
  field: FieldDefinition,
  data: InputJSON = { texts: {}, images: {}, tables: {} },
): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: [595, 842], margin: 0 })
  const template = loadedTemplate(makeManifest({ fields: [field] }))
  renderField(doc, field, data, new Map(), template, { pageIndex: 0 }, new Map())
  return doc
}

describe('renderField — hyperlink overlay (#87)', () => {
  it('static link: doc.link is called with the field bounding rect', () => {
    const field: FieldDefinition = {
      ...staticText('t1', 'Hello', { x: 50, y: 60, width: 200, height: 30 }),
      hyperlink: { mode: 'static', url: 'https://example.com' },
    }
    const doc = callRender(field)
    const spy = jest.spyOn(doc, 'link')
    // Re-render to capture the call (the spy was attached AFTER render
    // above — switch order so the spy is in place first).
    const doc2 = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc2, 'link')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(
      doc2,
      field,
      { texts: {}, images: {}, tables: {} },
      new Map(),
      template,
      { pageIndex: 0 },
      new Map(),
    )
    expect(linkSpy).toHaveBeenCalledTimes(1)
    expect(linkSpy).toHaveBeenCalledWith(50, 60, 200, 30, 'https://example.com')
    spy.mockRestore()
    linkSpy.mockRestore()
  })

  it('dynamic link: resolves via texts[jsonKey] and calls doc.link', () => {
    const field: FieldDefinition = {
      ...dynText('t1', 'name', false, { x: 10, y: 20, width: 100, height: 40 }),
      hyperlink: { mode: 'dynamic', jsonKey: 'profile_url' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const data: InputJSON = {
      texts: { name: 'Alice', profile_url: 'https://example.com/alice' },
      images: {},
      tables: {},
    }
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, data, new Map(), template, { pageIndex: 0 }, new Map())
    expect(linkSpy).toHaveBeenCalledTimes(1)
    expect(linkSpy).toHaveBeenCalledWith(10, 20, 100, 40, 'https://example.com/alice')
    linkSpy.mockRestore()
  })

  it('dynamic link with empty texts[jsonKey] does NOT call doc.link', () => {
    const field: FieldDefinition = {
      ...dynText('t1', 'name', false),
      hyperlink: { mode: 'dynamic', jsonKey: 'profile_url' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const data: InputJSON = {
      texts: { name: 'Alice', profile_url: '' },
      images: {},
      tables: {},
    }
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, data, new Map(), template, { pageIndex: 0 }, new Map())
    expect(linkSpy).not.toHaveBeenCalled()
    linkSpy.mockRestore()
  })

  it('dynamic link with missing key does NOT call doc.link', () => {
    const field: FieldDefinition = {
      ...dynText('t1', 'name', false),
      hyperlink: { mode: 'dynamic', jsonKey: 'profile_url' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const data: InputJSON = { texts: { name: 'Alice' }, images: {}, tables: {} }
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, data, new Map(), template, { pageIndex: 0 }, new Map())
    expect(linkSpy).not.toHaveBeenCalled()
    linkSpy.mockRestore()
  })

  it('field with no hyperlink: doc.link is never called', () => {
    const field = staticText('t1', 'Plain text', { x: 0, y: 0, width: 80, height: 20 })
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(
      doc,
      field,
      { texts: {}, images: {}, tables: {} },
      new Map(),
      template,
      { pageIndex: 0 },
      new Map(),
    )
    expect(linkSpy).not.toHaveBeenCalled()
    linkSpy.mockRestore()
  })

  it('table with a static hyperlink: link covers the whole table rect', () => {
    const field: FieldDefinition = {
      ...staticTable('tbl', ['a'], [{ a: 'x' }], { x: 100, y: 100, width: 400, height: 200 }),
      hyperlink: { mode: 'static', url: 'https://docs.example.com' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(
      doc,
      field,
      { texts: {}, images: {}, tables: {} },
      new Map(),
      template,
      { pageIndex: 0 },
      new Map(),
    )
    expect(linkSpy).toHaveBeenCalledTimes(1)
    expect(linkSpy).toHaveBeenCalledWith(100, 100, 400, 200, 'https://docs.example.com')
    linkSpy.mockRestore()
  })

  it('image with a static hyperlink: link covers the image rect', () => {
    const field: FieldDefinition = {
      ...staticImage('img', 'pic.png', { x: 5, y: 5, width: 50, height: 50 }),
      hyperlink: { mode: 'static', url: 'https://example.com' },
    }
    // No image bytes registered → renderImage path bails before painting,
    // but the hyperlink overlay still fires AFTER the switch since the
    // try-block doesn't throw. Confirm that.
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(
      doc,
      field,
      { texts: {}, images: {}, tables: {} },
      new Map(),
      template,
      { pageIndex: 0 },
      new Map(),
    )
    // doc.link should still be called — we link the rect, regardless of
    // whether bytes were available. (User may upload bytes later.)
    expect(linkSpy).toHaveBeenCalledTimes(1)
    expect(linkSpy).toHaveBeenCalledWith(5, 5, 50, 50, 'https://example.com')
    linkSpy.mockRestore()
  })
})
