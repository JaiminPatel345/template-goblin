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
      texts: { name: 'Alice' },
      images: {},
      tables: {},
      links: { profile_url: 'https://example.com/alice' },
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
      texts: { name: 'Alice' },
      images: {},
      tables: {},
      links: { profile_url: '' },
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

  it('static link with an INVALID URL: doc.link is not called (defensive)', () => {
    // validateManifest should have rejected this at load time. Render
    // double-checks via isValidHyperlinkUrl so a slip-through never
    // produces a clickable region pointing at garbage.
    const field: FieldDefinition = {
      ...staticText('t1', 'Hello'),
      hyperlink: { mode: 'static', url: 'ftp://nope' } as { mode: 'static'; url: string },
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
    expect(linkSpy).not.toHaveBeenCalled()
    linkSpy.mockRestore()
  })

  it('dynamic link with a non-string value (number) does NOT call doc.link', () => {
    const field: FieldDefinition = {
      ...dynText('t1', 'name', false),
      hyperlink: { mode: 'dynamic', jsonKey: 'profile_url' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const data = {
      texts: { name: 'Alice' },
      images: {},
      tables: {},
      links: { profile_url: 42 as unknown as string },
    } as unknown as InputJSON
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, data, new Map(), template, { pageIndex: 0 }, new Map())
    expect(linkSpy).not.toHaveBeenCalled()
    linkSpy.mockRestore()
  })

  it('two fields share the same dynamic key: each gets its own doc.link rect', () => {
    const fieldA: FieldDefinition = {
      ...dynText('t1', 'a', false, { x: 10, y: 10, width: 100, height: 30 }),
      hyperlink: { mode: 'dynamic', jsonKey: 'shared' },
    }
    const fieldB: FieldDefinition = {
      ...dynText('t2', 'b', false, { x: 200, y: 200, width: 80, height: 40 }),
      hyperlink: { mode: 'dynamic', jsonKey: 'shared' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const data: InputJSON = {
      texts: { a: 'A', b: 'B' },
      images: {},
      tables: {},
      links: { shared: 'https://shared.example.com' },
    }
    const template = loadedTemplate(makeManifest({ fields: [fieldA, fieldB] }))
    renderField(doc, fieldA, data, new Map(), template, { pageIndex: 0 }, new Map())
    renderField(doc, fieldB, data, new Map(), template, { pageIndex: 0 }, new Map())
    expect(linkSpy).toHaveBeenCalledTimes(2)
    expect(linkSpy).toHaveBeenNthCalledWith(1, 10, 10, 100, 30, 'https://shared.example.com')
    expect(linkSpy).toHaveBeenNthCalledWith(2, 200, 200, 80, 40, 'https://shared.example.com')
    linkSpy.mockRestore()
  })

  it('zero-size field with a hyperlink: doc.link still fires with the rect', () => {
    // Degenerate but legal — designer hasn't sized the field yet. The
    // renderer doesn't filter on size; the PDF viewer would just have a
    // 0×0 click target. Document the contract via a test.
    const field: FieldDefinition = {
      ...staticText('t1', 'x', { x: 0, y: 0, width: 0, height: 0 }),
      hyperlink: { mode: 'static', url: 'https://example.com' },
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
    expect(linkSpy).toHaveBeenCalledWith(0, 0, 0, 0, 'https://example.com')
    linkSpy.mockRestore()
  })

  it('mailto and tel render correctly', () => {
    const fieldA: FieldDefinition = {
      ...staticText('t1', 'mail', { x: 10, y: 10, width: 50, height: 20 }),
      hyperlink: { mode: 'static', url: 'mailto:hi@example.com' },
    }
    const fieldB: FieldDefinition = {
      ...staticText('t2', 'phone', { x: 80, y: 10, width: 50, height: 20 }),
      hyperlink: { mode: 'static', url: 'tel:+15551234' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const template = loadedTemplate(makeManifest({ fields: [fieldA, fieldB] }))
    renderField(
      doc,
      fieldA,
      { texts: {}, images: {}, tables: {} },
      new Map(),
      template,
      { pageIndex: 0 },
      new Map(),
    )
    renderField(
      doc,
      fieldB,
      { texts: {}, images: {}, tables: {} },
      new Map(),
      template,
      { pageIndex: 0 },
      new Map(),
    )
    expect(linkSpy).toHaveBeenCalledTimes(2)
    expect(linkSpy).toHaveBeenNthCalledWith(1, 10, 10, 50, 20, 'mailto:hi@example.com')
    expect(linkSpy).toHaveBeenNthCalledWith(2, 80, 10, 50, 20, 'tel:+15551234')
    linkSpy.mockRestore()
  })

  it('value sitting in texts (not links) does NOT trigger doc.link', () => {
    // The renderer reads from `data.links`. A URL placed in `data.texts`
    // — whether by mistake or migration — must not be treated as a link.
    const field: FieldDefinition = {
      ...dynText('t1', 'name', false),
      hyperlink: { mode: 'dynamic', jsonKey: 'profile_url' },
    }
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const linkSpy = jest.spyOn(doc, 'link')
    const data: InputJSON = {
      texts: { name: 'Alice', profile_url: 'https://example.com' },
      images: {},
      tables: {},
    }
    const template = loadedTemplate(makeManifest({ fields: [field] }))
    renderField(doc, field, data, new Map(), template, { pageIndex: 0 }, new Map())
    expect(linkSpy).not.toHaveBeenCalled()
    linkSpy.mockRestore()
  })
})
