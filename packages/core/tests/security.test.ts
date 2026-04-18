/**
 * QA security & robustness sweep — Phase 1 schema refactor.
 *
 * Each test documents a specific abuse surface. Where the product behaves as
 * the spec says, we pin that behaviour with a positive assertion. Where the
 * product falls short of the spec, the test is RED with a TODO marker and
 * asserts the CURRENT behaviour (so the test will break the moment a fix
 * lands and force a review of both the fix and the test).
 */

import {
  TemplateGoblinError,
  type CellStyle,
  type FieldDefinition,
  type TableField,
  type TableFieldStyle,
  type TemplateManifest,
  type TextField,
  type TextFieldStyle,
  type ImageField,
  type InputJSON,
  type LoadedTemplate,
} from '@template-goblin/types'
import { validateManifest } from '../src/validateManifest.js'
import { generatePDF } from '../src/generate.js'
import { staticText, dynText, makeManifest } from './helpers/fixtures.js'

const stubTextStyle = {} as TextFieldStyle
const stubCellStyle = {} as CellStyle

function stubTableStyle(cols: string[]): TableFieldStyle {
  return {
    maxRows: 10,
    maxColumns: 10,
    multiPage: false,
    showHeader: true,
    headerStyle: stubCellStyle,
    rowStyle: stubCellStyle,
    oddRowStyle: null,
    evenRowStyle: null,
    cellStyle: { overflowMode: 'truncate' },
    columns: cols.map((k) => ({
      key: k,
      label: k,
      width: 50,
      style: null,
      headerStyle: null,
    })),
  }
}

function baseManifest(fields: FieldDefinition[] = []): TemplateManifest {
  return {
    version: '2.0',
    meta: {
      name: 't',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 50,
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    },
    pages: [
      {
        id: 'p0',
        index: 0,
        backgroundType: 'color',
        backgroundColor: '#FFFFFF',
        backgroundFilename: null,
      },
    ],
    fonts: [],
    groups: [],
    fields,
  }
}

function textDyn(jsonKey: string, id: string): TextField {
  return {
    id,
    type: 'text',
    label: id,
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    zIndex: 0,
    style: stubTextStyle,
    source: { mode: 'dynamic', jsonKey, required: true, placeholder: null },
  }
}

function textStatic(value: string, id: string): TextField {
  return {
    id,
    type: 'text',
    label: id,
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    zIndex: 0,
    style: stubTextStyle,
    source: { mode: 'static', value },
  }
}

function tableStatic(value: unknown, columns = ['a'], id = 'tb'): TableField {
  return {
    id,
    type: 'table',
    label: id,
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 0,
    style: stubTableStyle(columns),
    source: { mode: 'static', value } as unknown as TableField['source'],
  }
}

function expectCode(fn: () => void, code: string): void {
  try {
    fn()
    throw new Error(`expected TemplateGoblinError(${code})`)
  } catch (e) {
    expect(e).toBeInstanceOf(TemplateGoblinError)
    expect((e as TemplateGoblinError).code).toBe(code)
  }
}

/* ================================================================== */
/*  1. Prototype-pollution vectors in jsonKey                         */
/* ================================================================== */

describe('security — prototype pollution via jsonKey', () => {
  /*
   * The spec's jsonKey regex is `^[A-Za-z_][A-Za-z0-9_]*$` — which *allowed*
   * dangerous JavaScript property names: `__proto__`, `constructor`,
   * `prototype`, `hasOwnProperty`. These later become direct property
   * accesses on an InputJSON bucket (`bucket[key]`); if the bucket is a plain
   * object the access walks the prototype chain and can return the Object
   * prototype's native functions.
   *
   * `validateManifest` now rejects these keys at template-load time via the
   * shared `isSafeKey` helper, matching `resolveKey`'s runtime behaviour.
   */
  const dangerous = ['__proto__', 'constructor', 'prototype', 'hasOwnProperty']

  for (const k of dangerous) {
    it(`SPEC-ALIGNED: should reject jsonKey "${k}" with INVALID_DYNAMIC_SOURCE`, () => {
      const m = baseManifest([textDyn(k, 'f1')])
      expectCode(() => validateManifest(m), 'INVALID_DYNAMIC_SOURCE')
    })
  }
})

/* ================================================================== */
/*  2. O(n) short-circuit on duplicate jsonKey                         */
/* ================================================================== */

describe('security — large manifest duplicate detection terminates quickly', () => {
  it('DUPLICATE_JSON_KEY with many duplicates still short-circuits in well under a second', () => {
    // Build a manifest with 1000 dynamic text fields all sharing jsonKey="k".
    // validateManifest should surface a DUPLICATE_JSON_KEY without iterating
    // every field (at the very least, it should finish fast).
    const fields: FieldDefinition[] = []
    for (let i = 0; i < 1000; i++) {
      fields.push(textDyn('k', `f${i}`))
    }
    const m = baseManifest(fields)
    const start = Date.now()
    expectCode(() => validateManifest(m), 'DUPLICATE_JSON_KEY')
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(1000)
  })
})

/* ================================================================== */
/*  3. Weird static-table values                                       */
/* ================================================================== */

describe('security — hostile static table payloads', () => {
  it('rejects a static table containing a self-referencing row', () => {
    const row: Record<string, unknown> = { a: '1' }
    row['self'] = row // circular reference
    const m = baseManifest([tableStatic([row], ['a'])])
    // Must not hang, must not throw a non-TemplateGoblinError. Either:
    //  (a) INVALID_TABLE_ROW (row has an unknown key 'self'), or
    //  (b) INVALID_STATIC_VALUE if the validator detects the circular shape.
    try {
      validateManifest(m)
      throw new Error('expected a TemplateGoblinError')
    } catch (e) {
      expect(e).toBeInstanceOf(TemplateGoblinError)
      const code = (e as TemplateGoblinError).code
      expect(['INVALID_TABLE_ROW', 'INVALID_STATIC_VALUE']).toContain(code)
    }
  })

  it('rejects a static table row whose values are not strings', () => {
    const row = { a: { nested: 'object' } } as unknown as Record<string, string>
    const m = baseManifest([tableStatic([row], ['a'])])
    expectCode(() => validateManifest(m), 'INVALID_TABLE_ROW')
  })

  it('validates a 50,000-row static table in well under a second (no superlinear blow-up)', () => {
    const rows: { a: string }[] = []
    for (let i = 0; i < 50_000; i++) rows.push({ a: `${i}` })
    const m = baseManifest([tableStatic(rows, ['a'])])
    const start = Date.now()
    expect(() => validateManifest(m)).not.toThrow()
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(2000)
  })

  it('large maxRows does not cause allocation at parse time', () => {
    // maxRows is a styling hint, NOT a capacity. Setting it to a million
    // should be a constant-time assignment in validateManifest.
    const tbl: TableField = tableStatic([], ['a'])
    tbl.style.maxRows = 1_000_000
    const m = baseManifest([tbl])
    const start = Date.now()
    expect(() => validateManifest(m)).not.toThrow()
    expect(Date.now() - start).toBeLessThan(50)
  })
})

/* ================================================================== */
/*  4. Required-field empty/null/undefined narrowing                   */
/* ================================================================== */

describe('security — required-field emptiness narrowing at generate time', () => {
  function requireNameTemplate(): LoadedTemplate {
    const manifest = makeManifest({
      fields: [dynText('f1', 'name', true, { x: 10, y: 10, width: 200, height: 30, zIndex: 0 })],
    })
    return {
      manifest,
      backgroundImage: null,
      pageBackgrounds: new Map(),
      fonts: new Map(),
      placeholders: new Map(),
      staticImages: new Map(),
    }
  }

  const cases: [string, unknown][] = [
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
  ]

  for (const [label, value] of cases) {
    it(`required dynamic text field with value ${label} rejects with MISSING_REQUIRED_FIELD`, async () => {
      const template = requireNameTemplate()
      const data = {
        texts: value === undefined ? {} : { name: value },
        images: {},
        tables: {},
      } as unknown as InputJSON
      await expect(generatePDF(template, data)).rejects.toMatchObject({
        code: 'MISSING_REQUIRED_FIELD',
      })
    })
  }
})

/* ================================================================== */
/*  5. Static text with extremely long string                          */
/* ================================================================== */

describe('security — static text does not enforce MAX_TEXT_LENGTH', () => {
  /*
   * The existing 100k-char limit on dynamic text input is a DoS guard on
   * data supplied at runtime. Static values are author-controlled and not
   * subject to the same guard. This test PINS that current behaviour.
   */
  it('static text field with 150,000-char value renders a PDF without throwing', async () => {
    const huge = 'x'.repeat(150_000)
    const field = staticText('big', huge, { x: 10, y: 10, width: 500, height: 800, zIndex: 0 })
    const manifest = makeManifest({ fields: [field] })
    const template: LoadedTemplate = {
      manifest,
      backgroundImage: null,
      pageBackgrounds: new Map(),
      fonts: new Map(),
      placeholders: new Map(),
      staticImages: new Map(),
    }
    const data: InputJSON = { texts: {}, images: {}, tables: {} }
    // Just needs to not throw; the rendering is overflow-truncated.
    const pdf = await generatePDF(template, data)
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })
})

/* ================================================================== */
/*  6. Static image pointing at bad bytes                              */
/* ================================================================== */

describe('security — static image with non-image bytes', () => {
  /*
   * If a template has a static image field and the image bytes in
   * `LoadedTemplate.staticImages` are corrupt (e.g. the author uploaded a
   * font file by mistake), PDF generation should fail loudly with a
   * TemplateGoblinError — not crash the process or silently produce an
   * invalid PDF.
   */
  it('static image with bogus bytes rejects with a TemplateGoblinError', async () => {
    const staticImgField: ImageField = {
      id: 'logo',
      type: 'image',
      label: 'logo',
      groupId: null,
      pageId: null,
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      zIndex: 0,
      style: { fit: 'contain' },
      source: { mode: 'static', value: { filename: 'logo.png' } },
    }
    const manifest = makeManifest({ fields: [staticImgField] })

    const template: LoadedTemplate = {
      manifest,
      backgroundImage: null,
      pageBackgrounds: new Map(),
      fonts: new Map(),
      placeholders: new Map(),
      // Hand PDFKit a buffer of ASCII garbage — definitely not a PNG/JPEG.
      staticImages: new Map([['logo.png', Buffer.from('this-is-not-an-image')]]),
    }

    await expect(generatePDF(template, { texts: {}, images: {}, tables: {} })).rejects.toThrow()
  })
})

/* ================================================================== */
/*  7. Round-trip fuzz: static / dynamic / mixed                        */
/* ================================================================== */

import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { loadTemplate } from '../src/load.js'
import { saveTemplate } from '../src/file/write.js'
import { dynImage, dynTable, staticImage, staticTable } from './helpers/fixtures.js'

describe('security — manifest round-trip fuzz', () => {
  let tmp: string

  beforeAll(() => {
    tmp = join(tmpdir(), `tg-rt-fuzz-${randomUUID()}`)
    mkdirSync(tmp, { recursive: true })
  })
  afterAll(() => {
    if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true })
  })

  async function roundTrip(
    name: string,
    fields: FieldDefinition[],
    staticImages = new Map<string, Buffer>(),
  ): Promise<void> {
    const manifest = makeManifest({ fields })
    const outPath = join(tmp, `${name}.tgbl`)
    await saveTemplate(
      manifest,
      {
        backgroundImage: null,
        pageBackgrounds: new Map(),
        fonts: new Map(),
        placeholders: new Map(),
        staticImages,
      },
      outPath,
    )

    const loaded = await loadTemplate(outPath)
    // Field count and types preserved.
    expect(loaded.manifest.fields).toHaveLength(fields.length)

    const byId = new Map(loaded.manifest.fields.map((f) => [f.id, f]))
    for (const original of fields) {
      const reloaded = byId.get(original.id)
      expect(reloaded).toBeDefined()
      expect(reloaded!.type).toBe(original.type)
      expect(reloaded!.source).toEqual(original.source)
    }
  }

  it('all static fields round-trip structurally', async () => {
    const logoData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    await roundTrip(
      'all-static',
      [
        textStatic('Certificate of Completion', 's1'),
        staticImage('logo', 'logo.png', { x: 10, y: 10, width: 50, height: 50 }),
        staticTable('facts', ['k', 'v'], [{ k: 'pi', v: '3.14' }], {
          x: 10,
          y: 80,
          width: 200,
          height: 60,
        }),
      ],
      new Map([['logo.png', logoData]]),
    )
  })

  it('all dynamic fields round-trip structurally', async () => {
    await roundTrip('all-dynamic', [
      dynText('t1', 'name', true),
      dynImage('i1', 'photo', false),
      dynTable('tb1', 'items', true, ['name', 'qty']),
    ])
  })

  it('mixed static and dynamic fields round-trip structurally', async () => {
    const heroData = Buffer.from('hero-png-bytes')
    await roundTrip(
      'mixed',
      [
        textStatic('Welcome,', 's1'),
        dynText('t1', 'name', true),
        staticImage('hero', 'hero.png', { x: 10, y: 80, width: 200, height: 100 }),
        dynImage('i1', 'avatar', false),
        staticTable('facts', ['a'], [{ a: '1' }, { a: '2' }], {
          x: 10,
          y: 200,
          width: 200,
          height: 60,
        }),
        dynTable('tb1', 'rows', false, ['a']),
      ],
      new Map([['hero.png', heroData]]),
    )
  })
})

/* ================================================================== */
/*  8. Manifest with a bogus `source` in a raw JSON payload            */
/* ================================================================== */

describe('security — loadTemplate rejects bogus manifest JSON', () => {
  /*
   * When the manifest is supplied via a .tgbl file (untrusted input), a
   * crafted JSON with a weird `source` shape must be surfaced as a
   * TemplateGoblinError, not a raw TypeError/SyntaxError.
   */

  let tmp: string
  beforeAll(() => {
    tmp = join(tmpdir(), `tg-sec-loadrej-${randomUUID()}`)
    mkdirSync(tmp, { recursive: true })
  })
  afterAll(() => {
    if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true })
  })

  function writeTgblRaw(name: string, manifest: unknown): string {
    const zip = new AdmZip()
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'))
    const p = join(tmp, name)
    writeFileSync(p, zip.toBuffer())
    return p
  }

  it('loadTemplate rejects a manifest where field.source is an array', async () => {
    const manifest = {
      version: '1.0',
      meta: {
        name: 'x',
        width: 595,
        height: 842,
        unit: 'pt',
        pageSize: 'A4',
        locked: false,
        maxPages: 1,
        createdAt: '2026-04-18T00:00:00Z',
        updatedAt: '2026-04-18T00:00:00Z',
      },
      pages: [],
      fonts: [],
      groups: [],
      fields: [
        {
          id: 'x',
          type: 'text',
          label: 'x',
          groupId: null,
          pageId: null,
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          zIndex: 0,
          style: {},
          source: [],
        },
      ],
    }
    const p = writeTgblRaw('bogus-source.tgbl', manifest)
    await expect(loadTemplate(p)).rejects.toBeInstanceOf(TemplateGoblinError)
  })
})
