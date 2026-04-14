import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import AdmZip from 'adm-zip'
import type { TemplateManifest, TemplateAssets } from '@template-goblin/types'
import { saveTemplate } from '../../src/file/write.js'
import { readTgblBuffer, readManifest } from '../../src/file/read.js'
import {
  MANIFEST_FILENAME,
  BACKGROUND_FILENAME,
  FONTS_DIR,
  PLACEHOLDERS_DIR,
} from '../../src/file/constants.js'

/**
 * Build a minimal valid TemplateManifest for testing.
 */
function createValidManifest(overrides: Partial<TemplateManifest> = {}): TemplateManifest {
  return {
    version: '1.0',
    meta: {
      name: 'Test Template',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    fonts: [],
    groups: [],
    fields: [],
    ...overrides,
  }
}

/**
 * Create a minimal TemplateAssets object.
 */
function createEmptyAssets(): TemplateAssets {
  return {
    backgroundImage: null,
    fonts: new Map(),
    placeholders: new Map(),
  }
}

let tmpDir: string

beforeAll(() => {
  tmpDir = join(tmpdir(), `tgbl-write-test-${randomUUID()}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterAll(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// saveTemplate — basic ZIP creation
// ---------------------------------------------------------------------------
describe('saveTemplate', () => {
  it('should create a valid ZIP file on disk', async () => {
    const manifest = createValidManifest()
    const assets = createEmptyAssets()
    const outputPath = join(tmpDir, 'basic.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    expect(existsSync(outputPath)).toBe(true)
    const bytes = readFileSync(outputPath)
    // Should start with PK magic bytes
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
  })

  it('should include manifest.json in the ZIP', async () => {
    const manifest = createValidManifest()
    const assets = createEmptyAssets()
    const outputPath = join(tmpDir, 'with-manifest.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const zip = new AdmZip(outputPath)
    const entry = zip.getEntry(MANIFEST_FILENAME)
    expect(entry).not.toBeNull()

    const parsed = JSON.parse(entry!.getData().toString('utf-8'))
    expect(parsed.version).toBe('1.0')
    expect(parsed.meta.name).toBe('Test Template')
  })

  it('should store manifest as pretty-printed JSON', async () => {
    const manifest = createValidManifest()
    const assets = createEmptyAssets()
    const outputPath = join(tmpDir, 'pretty-json.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const zip = new AdmZip(outputPath)
    const raw = zip.getEntry(MANIFEST_FILENAME)!.getData().toString('utf-8')
    // JSON.stringify with indent 2 produces newlines
    expect(raw).toContain('\n')
    expect(raw).toBe(JSON.stringify(manifest, null, 2))
  })

  it('should include background image when provided', async () => {
    const manifest = createValidManifest()
    const bgData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe, 0xfd]) // fake PNG-ish bytes
    const assets: TemplateAssets = {
      backgroundImage: bgData,
      fonts: new Map(),
      placeholders: new Map(),
    }
    const outputPath = join(tmpDir, 'with-bg.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const zip = new AdmZip(outputPath)
    const entry = zip.getEntry(BACKGROUND_FILENAME)
    expect(entry).not.toBeNull()
    expect(entry!.getData()).toEqual(bgData)
  })

  it('should not include background entry when backgroundImage is null', async () => {
    const manifest = createValidManifest()
    const assets = createEmptyAssets()
    const outputPath = join(tmpDir, 'no-bg.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const zip = new AdmZip(outputPath)
    expect(zip.getEntry(BACKGROUND_FILENAME)).toBeNull()
  })

  it('should include fonts under the fonts/ directory using manifest filename', async () => {
    const manifest = createValidManifest({
      fonts: [
        { id: 'roboto', name: 'Roboto', filename: 'fonts/roboto-regular.ttf' },
        { id: 'opensans', name: 'Open Sans', filename: 'fonts/opensans-bold.ttf' },
      ],
    })
    const robotoData = Buffer.from('fake-roboto-ttf-data')
    const opensansData = Buffer.from('fake-opensans-ttf-data')
    const assets: TemplateAssets = {
      backgroundImage: null,
      fonts: new Map([
        ['roboto', robotoData],
        ['opensans', opensansData],
      ]),
      placeholders: new Map(),
    }
    const outputPath = join(tmpDir, 'with-fonts.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const zip = new AdmZip(outputPath)
    const robotoEntry = zip.getEntry('fonts/roboto-regular.ttf')
    const opensansEntry = zip.getEntry('fonts/opensans-bold.ttf')
    expect(robotoEntry).not.toBeNull()
    expect(opensansEntry).not.toBeNull()
    expect(robotoEntry!.getData()).toEqual(robotoData)
    expect(opensansEntry!.getData()).toEqual(opensansData)
  })

  it('should fall back to fonts/<id>.ttf when font is not found in manifest', async () => {
    const manifest = createValidManifest({ fonts: [] })
    const fontData = Buffer.from('mystery-font')
    const assets: TemplateAssets = {
      backgroundImage: null,
      fonts: new Map([['unknown-font', fontData]]),
      placeholders: new Map(),
    }
    const outputPath = join(tmpDir, 'font-fallback.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const zip = new AdmZip(outputPath)
    const entry = zip.getEntry(`${FONTS_DIR}unknown-font.ttf`)
    expect(entry).not.toBeNull()
    expect(entry!.getData()).toEqual(fontData)
  })

  it('should include placeholders under the placeholders/ directory', async () => {
    const manifest = createValidManifest()
    const placeholder1 = Buffer.from('placeholder-image-1')
    const placeholder2 = Buffer.from('placeholder-image-2')
    const assets: TemplateAssets = {
      backgroundImage: null,
      fonts: new Map(),
      placeholders: new Map([
        ['avatar.png', placeholder1],
        ['logo.png', placeholder2],
      ]),
    }
    const outputPath = join(tmpDir, 'with-placeholders.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const zip = new AdmZip(outputPath)
    const entry1 = zip.getEntry(`${PLACEHOLDERS_DIR}avatar.png`)
    const entry2 = zip.getEntry(`${PLACEHOLDERS_DIR}logo.png`)
    expect(entry1).not.toBeNull()
    expect(entry2).not.toBeNull()
    expect(entry1!.getData()).toEqual(placeholder1)
    expect(entry2!.getData()).toEqual(placeholder2)
  })

  it('should not double-prefix placeholders that already start with placeholders/', async () => {
    const manifest = createValidManifest()
    const imgData = Buffer.from('img-bytes')
    const assets: TemplateAssets = {
      backgroundImage: null,
      fonts: new Map(),
      placeholders: new Map([['placeholders/already-prefixed.png', imgData]]),
    }
    const outputPath = join(tmpDir, 'no-double-prefix.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const zip = new AdmZip(outputPath)
    expect(zip.getEntry('placeholders/already-prefixed.png')).not.toBeNull()
    // Should NOT have placeholders/placeholders/...
    expect(zip.getEntry('placeholders/placeholders/already-prefixed.png')).toBeNull()
  })

  it('should create output directory if it does not exist', async () => {
    const manifest = createValidManifest()
    const assets = createEmptyAssets()
    const nestedDir = join(tmpDir, 'deeply', 'nested', 'dir')
    const outputPath = join(nestedDir, 'auto-created.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    expect(existsSync(outputPath)).toBe(true)
  })

  it('should produce a complete ZIP with all asset types', async () => {
    const manifest = createValidManifest({
      fonts: [{ id: 'myfont', name: 'MyFont', filename: 'fonts/myfont.ttf' }],
    })
    const bgData = Buffer.from('background-bytes')
    const fontData = Buffer.from('font-bytes')
    const placeholderData = Buffer.from('placeholder-bytes')
    const assets: TemplateAssets = {
      backgroundImage: bgData,
      fonts: new Map([['myfont', fontData]]),
      placeholders: new Map([['thumb.png', placeholderData]]),
    }
    const outputPath = join(tmpDir, 'complete.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const zip = new AdmZip(outputPath)
    const entries = zip
      .getEntries()
      .map((e) => e.entryName)
      .sort()
    expect(entries).toContain(MANIFEST_FILENAME)
    expect(entries).toContain(BACKGROUND_FILENAME)
    expect(entries).toContain('fonts/myfont.ttf')
    expect(entries).toContain('placeholders/thumb.png')
  })
})

// ---------------------------------------------------------------------------
// Roundtrip: saveTemplate -> readTgblBuffer -> parseManifestFromZip
// ---------------------------------------------------------------------------
describe('roundtrip: save then read', () => {
  it('should produce a file that readTgblBuffer accepts', async () => {
    const manifest = createValidManifest()
    const assets = createEmptyAssets()
    const outputPath = join(tmpDir, 'roundtrip-buffer.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    const buffer = readTgblBuffer(outputPath)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('should roundtrip manifest data through save and readManifest', async () => {
    const manifest = createValidManifest({
      version: '1.0',
      fonts: [{ id: 'inter', name: 'Inter', filename: 'fonts/inter.ttf' }],
      groups: [{ id: 'header', name: 'Header Section' }],
      fields: [
        {
          id: 'company_name',
          type: 'text',
          groupId: 'header',
          required: true,
          jsonKey: 'company',
          placeholder: 'Acme Corp',
          x: 50,
          y: 30,
          width: 300,
          height: 40,
          zIndex: 1,
          style: {} as any,
        },
      ],
    })
    const assets = createEmptyAssets()
    const outputPath = join(tmpDir, 'roundtrip-manifest.tgbl')

    await saveTemplate(manifest, assets, outputPath)
    const result = await readManifest(outputPath)

    expect(result.version).toBe(manifest.version)
    expect(result.meta).toEqual(manifest.meta)
    expect(result.fonts).toEqual(manifest.fonts)
    expect(result.groups).toEqual(manifest.groups)
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0]!.id).toBe('company_name')
    expect(result.fields[0]!.type).toBe('text')
    expect(result.fields[0]!.required).toBe(true)
    expect(result.fields[0]!.jsonKey).toBe('company')
  })

  it('should roundtrip binary assets through save and AdmZip re-read', async () => {
    const manifest = createValidManifest({
      fonts: [{ id: 'bold', name: 'Bold Font', filename: 'fonts/bold.ttf' }],
    })
    const bgData = Buffer.alloc(256)
    for (let i = 0; i < 256; i++) bgData[i] = i // all byte values 0-255
    const fontData = Buffer.from('this-is-a-font-binary-payload')
    const placeholderData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) // PNG header

    const assets: TemplateAssets = {
      backgroundImage: bgData,
      fonts: new Map([['bold', fontData]]),
      placeholders: new Map([['avatar.png', placeholderData]]),
    }
    const outputPath = join(tmpDir, 'roundtrip-binary.tgbl')

    await saveTemplate(manifest, assets, outputPath)

    // Re-read and verify binary fidelity
    const buffer = readTgblBuffer(outputPath)
    const zip = new AdmZip(buffer)

    const bgEntry = zip.getEntry(BACKGROUND_FILENAME)
    expect(bgEntry).not.toBeNull()
    expect(bgEntry!.getData()).toEqual(bgData)

    const fontEntry = zip.getEntry('fonts/bold.ttf')
    expect(fontEntry).not.toBeNull()
    expect(fontEntry!.getData()).toEqual(fontData)

    const phEntry = zip.getEntry('placeholders/avatar.png')
    expect(phEntry).not.toBeNull()
    expect(phEntry!.getData()).toEqual(placeholderData)
  })

  it('should roundtrip a manifest with multiple fields of all types', async () => {
    const manifest = createValidManifest({
      fields: [
        {
          id: 'txt1',
          type: 'text',
          groupId: null,
          required: true,
          jsonKey: 'name',
          placeholder: 'Name',
          x: 0,
          y: 0,
          width: 200,
          height: 30,
          zIndex: 0,
          style: {} as any,
        },
        {
          id: 'img1',
          type: 'image',
          groupId: null,
          required: false,
          jsonKey: 'photo',
          placeholder: null,
          x: 0,
          y: 40,
          width: 150,
          height: 150,
          zIndex: 1,
          style: {} as any,
        },
        {
          id: 'loop1',
          type: 'loop',
          groupId: null,
          required: false,
          jsonKey: 'items',
          placeholder: null,
          x: 0,
          y: 200,
          width: 500,
          height: 300,
          zIndex: 2,
          style: {} as any,
        },
      ],
    })
    const assets = createEmptyAssets()
    const outputPath = join(tmpDir, 'roundtrip-fields.tgbl')

    await saveTemplate(manifest, assets, outputPath)
    const result = await readManifest(outputPath)

    expect(result.fields).toHaveLength(3)
    expect(result.fields.map((f) => f.type)).toEqual(['text', 'image', 'loop'])
    expect(result.fields.map((f) => f.id)).toEqual(['txt1', 'img1', 'loop1'])
  })

  it('should roundtrip with no assets at all', async () => {
    const manifest = createValidManifest()
    const assets = createEmptyAssets()
    const outputPath = join(tmpDir, 'roundtrip-empty.tgbl')

    await saveTemplate(manifest, assets, outputPath)
    const result = await readManifest(outputPath)

    expect(result).toEqual(manifest)
  })
})
