import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import AdmZip from 'adm-zip'
import { TemplateGoblinError } from '@template-goblin/types'
import type { TemplateManifest } from '@template-goblin/types'
import { readTgblBuffer, parseManifestFromZip, readManifest } from '../../src/file/read.js'
import { dynImage, dynTable, dynText, makeManifest } from '../helpers/fixtures.js'

/**
 * Build a minimal valid TemplateManifest for testing.
 */
function createValidManifest(overrides: Partial<TemplateManifest> = {}): TemplateManifest {
  return makeManifest({
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
    ...overrides,
  })
}

/**
 * Create a ZIP buffer containing a manifest.json with the given content.
 */
function createZipWithManifest(manifest: TemplateManifest): Buffer {
  const zip = new AdmZip()
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'))
  return zip.toBuffer()
}

let tmpDir: string

beforeAll(() => {
  tmpDir = join(tmpdir(), `tgbl-read-test-${randomUUID()}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterAll(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// readTgblBuffer
// ---------------------------------------------------------------------------
describe('readTgblBuffer', () => {
  it('should return a Buffer for a valid ZIP file', () => {
    const zipBuffer = createZipWithManifest(createValidManifest())
    const filePath = join(tmpDir, 'valid.tgbl')
    writeFileSync(filePath, zipBuffer)

    const result = readTgblBuffer(filePath)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // PK header preserved
    expect(result[0]).toBe(0x50)
    expect(result[1]).toBe(0x4b)
  })

  it('should throw FILE_NOT_FOUND for a non-existent file', () => {
    const fakePath = join(tmpDir, 'does-not-exist.tgbl')

    expect(() => readTgblBuffer(fakePath)).toThrow(TemplateGoblinError)
    try {
      readTgblBuffer(fakePath)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('FILE_NOT_FOUND')
    }
  })

  it('should throw INVALID_FORMAT for a non-ZIP file', () => {
    const filePath = join(tmpDir, 'not-a-zip.tgbl')
    writeFileSync(filePath, 'this is plain text, not a zip')

    expect(() => readTgblBuffer(filePath)).toThrow(TemplateGoblinError)
    try {
      readTgblBuffer(filePath)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_FORMAT')
    }
  })

  it('should throw INVALID_FORMAT for an empty file', () => {
    const filePath = join(tmpDir, 'empty.tgbl')
    writeFileSync(filePath, Buffer.alloc(0))

    expect(() => readTgblBuffer(filePath)).toThrow(TemplateGoblinError)
    try {
      readTgblBuffer(filePath)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_FORMAT')
    }
  })

  it('should throw INVALID_FORMAT for a one-byte file', () => {
    const filePath = join(tmpDir, 'one-byte.tgbl')
    writeFileSync(filePath, Buffer.from([0x50])) // only first magic byte

    expect(() => readTgblBuffer(filePath)).toThrow(TemplateGoblinError)
    try {
      readTgblBuffer(filePath)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_FORMAT')
    }
  })

  it('should throw INVALID_FORMAT when bytes look almost like ZIP but second byte is wrong', () => {
    const filePath = join(tmpDir, 'bad-magic.tgbl')
    writeFileSync(filePath, Buffer.from([0x50, 0x00, 0x03, 0x04]))

    expect(() => readTgblBuffer(filePath)).toThrow(TemplateGoblinError)
    try {
      readTgblBuffer(filePath)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_FORMAT')
    }
  })

  it('should throw INVALID_FORMAT when file starts with magic bytes but is corrupted', async () => {
    const filePath = join(tmpDir, 'corrupted.tgbl')
    // PK magic bytes + garbage
    writeFileSync(filePath, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]))

    // readTgblBuffer only checks magic bytes, so it should PASS
    const buffer = readTgblBuffer(filePath)
    expect(buffer).toBeDefined()

    // readManifest should FAIL because AdmZip will fail to parse it
    await expect(readManifest(filePath)).rejects.toThrow(TemplateGoblinError)
    await expect(readManifest(filePath)).rejects.toMatchObject({
      code: 'INVALID_FORMAT',
      message: /corrupted ZIP archive/,
    })
  })
})

// ---------------------------------------------------------------------------
// parseManifestFromZip
// ---------------------------------------------------------------------------
describe('parseManifestFromZip', () => {
  it('should parse a valid manifest from a ZIP', () => {
    const manifest = createValidManifest()
    const zip = new AdmZip()
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'))

    const result = parseManifestFromZip(zip)
    expect(result.version).toBe('1.0')
    expect(result.meta.name).toBe('Test Template')
    expect(result.meta.width).toBe(595)
    expect(result.meta.height).toBe(842)
    expect(result.fonts).toEqual([])
    expect(result.groups).toEqual([])
    expect(result.fields).toEqual([])
  })

  it('should throw MISSING_MANIFEST when ZIP has no manifest.json', () => {
    const zip = new AdmZip()
    zip.addFile('other.txt', Buffer.from('hello'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('MISSING_MANIFEST')
    }
  })

  it('should throw MISSING_MANIFEST when ZIP is completely empty', () => {
    const zip = new AdmZip()

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('MISSING_MANIFEST')
    }
  })

  it('should throw INVALID_MANIFEST for malformed JSON', () => {
    const zip = new AdmZip()
    zip.addFile('manifest.json', Buffer.from('{ this is not valid json }'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_MANIFEST')
    }
  })

  it('should throw INVALID_MANIFEST when version is missing', () => {
    const zip = new AdmZip()
    const badManifest = {
      meta: { name: 'x', width: 100, height: 100 },
      fonts: [],
      groups: [],
      fields: [],
    }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(badManifest), 'utf-8'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_MANIFEST')
      expect((err as TemplateGoblinError).message).toMatch(/version/)
    }
  })

  it('should throw INVALID_MANIFEST when meta is missing', () => {
    const zip = new AdmZip()
    const badManifest = { version: '1.0', fonts: [], groups: [], fields: [] }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(badManifest), 'utf-8'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_MANIFEST')
      expect((err as TemplateGoblinError).message).toMatch(/meta/)
    }
  })

  it('should throw INVALID_MANIFEST when meta.width/height are not numbers', () => {
    const zip = new AdmZip()
    const badManifest = {
      version: '1.0',
      meta: { name: 'x', width: 'big', height: 'tall' },
      fonts: [],
      groups: [],
      fields: [],
    }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(badManifest), 'utf-8'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_MANIFEST')
      expect((err as TemplateGoblinError).message).toMatch(/width.*height/)
    }
  })

  it('should throw INVALID_MANIFEST when fields is not an array', () => {
    const zip = new AdmZip()
    const badManifest = {
      version: '1.0',
      meta: {
        name: 'x',
        width: 100,
        height: 200,
        unit: 'pt',
        pageSize: 'A4',
        locked: false,
        maxPages: 1,
        createdAt: '',
        updatedAt: '',
      },
      fonts: [],
      groups: [],
      fields: 'not-array',
    }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(badManifest), 'utf-8'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_MANIFEST')
      expect((err as TemplateGoblinError).message).toMatch(/fields/)
    }
  })

  it('should throw INVALID_MANIFEST when fonts is not an array', () => {
    const zip = new AdmZip()
    const badManifest = {
      version: '1.0',
      meta: {
        name: 'x',
        width: 100,
        height: 200,
        unit: 'pt',
        pageSize: 'A4',
        locked: false,
        maxPages: 1,
        createdAt: '',
        updatedAt: '',
      },
      fonts: 'not-array',
      groups: [],
      fields: [],
    }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(badManifest), 'utf-8'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_MANIFEST')
      expect((err as TemplateGoblinError).message).toMatch(/fonts/)
    }
  })

  it('should throw INVALID_MANIFEST when groups is not an array', () => {
    const zip = new AdmZip()
    const badManifest = {
      version: '1.0',
      meta: {
        name: 'x',
        width: 100,
        height: 200,
        unit: 'pt',
        pageSize: 'A4',
        locked: false,
        maxPages: 1,
        createdAt: '',
        updatedAt: '',
      },
      fonts: [],
      groups: 'not-array',
      fields: [],
    }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(badManifest), 'utf-8'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_MANIFEST')
      expect((err as TemplateGoblinError).message).toMatch(/groups/)
    }
  })

  it('should throw INVALID_MANIFEST when a field has no id', () => {
    const zip = new AdmZip()
    const manifest = createValidManifest({
      fields: [
        // Deliberately invalid: missing `id` so the structural validator rejects it.
        {
          type: 'text',
          groupId: null,
          pageId: null,
          label: 'no-id',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          zIndex: 0,
          style: {} as never,
          source: { mode: 'dynamic', jsonKey: 'x', required: false, placeholder: null },
        } as never,
      ],
    })
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_MANIFEST')
      expect((err as TemplateGoblinError).message).toMatch(/field at index 0/)
    }
  })

  it('should throw INVALID_MANIFEST when a field has an invalid type', () => {
    const zip = new AdmZip()
    const manifest = createValidManifest({
      fields: [
        {
          id: 'f1',
          type: 'video' as never,
          groupId: null,
          pageId: null,
          label: 'video-f',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          zIndex: 0,
          style: {} as never,
          source: { mode: 'dynamic', jsonKey: 'x', required: false, placeholder: null },
        } as never,
      ],
    })
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'))

    expect(() => parseManifestFromZip(zip)).toThrow(TemplateGoblinError)
    try {
      parseManifestFromZip(zip)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('INVALID_MANIFEST')
      expect((err as TemplateGoblinError).message).toMatch(/invalid type/)
    }
  })

  it('should accept a manifest with valid text, image, and table fields', () => {
    const zip = new AdmZip()
    const manifest = createValidManifest({
      fields: [
        dynText('f-text', 'name', false, { x: 0, y: 0, width: 100, height: 50, zIndex: 0 }),
        dynImage('f-image', 'photo', false, { x: 0, y: 60, width: 100, height: 100, zIndex: 1 }),
        dynTable('f-table', 'rows', false, ['col'], {
          x: 0,
          y: 170,
          width: 400,
          height: 200,
          zIndex: 2,
        }),
      ],
    })
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'))

    const result = parseManifestFromZip(zip)
    expect(result.fields).toHaveLength(3)
    expect(result.fields[0]!.type).toBe('text')
    expect(result.fields[1]!.type).toBe('image')
    expect(result.fields[2]!.type).toBe('table')
  })
})

// ---------------------------------------------------------------------------
// readManifest (integration: combines readTgblBuffer + parseManifestFromZip)
// ---------------------------------------------------------------------------
describe('readManifest', () => {
  it('should read and parse manifest from a valid .tgbl file', async () => {
    const manifest = createValidManifest({ version: '1.0' })
    const zipBuffer = createZipWithManifest(manifest)
    const filePath = join(tmpDir, 'read-manifest-valid.tgbl')
    writeFileSync(filePath, zipBuffer)

    const result = await readManifest(filePath)
    expect(result.version).toBe('1.0')
    expect(result.meta.name).toBe('Test Template')
    expect(result.meta.width).toBe(595)
    expect(result.meta.height).toBe(842)
    expect(result.fields).toEqual([])
    expect(result.fonts).toEqual([])
    expect(result.groups).toEqual([])
  })

  it('should throw FILE_NOT_FOUND for a missing file', async () => {
    const fakePath = join(tmpDir, 'no-such-file.tgbl')

    await expect(readManifest(fakePath)).rejects.toThrow(TemplateGoblinError)
    await expect(readManifest(fakePath)).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' })
  })

  it('should throw INVALID_FORMAT for a non-ZIP file', async () => {
    const filePath = join(tmpDir, 'read-manifest-bad-format.tgbl')
    writeFileSync(filePath, 'just some text, definitely not a zip')

    await expect(readManifest(filePath)).rejects.toThrow(TemplateGoblinError)
    await expect(readManifest(filePath)).rejects.toMatchObject({ code: 'INVALID_FORMAT' })
  })

  it('should throw MISSING_MANIFEST for a ZIP without manifest.json', async () => {
    const zip = new AdmZip()
    zip.addFile('readme.txt', Buffer.from('no manifest here'))
    const filePath = join(tmpDir, 'read-manifest-no-manifest.tgbl')
    writeFileSync(filePath, zip.toBuffer())

    await expect(readManifest(filePath)).rejects.toThrow(TemplateGoblinError)
    await expect(readManifest(filePath)).rejects.toMatchObject({ code: 'MISSING_MANIFEST' })
  })

  it('should throw INVALID_MANIFEST for a ZIP with invalid JSON manifest', async () => {
    const zip = new AdmZip()
    zip.addFile('manifest.json', Buffer.from('NOT JSON'))
    const filePath = join(tmpDir, 'read-manifest-bad-json.tgbl')
    writeFileSync(filePath, zip.toBuffer())

    await expect(readManifest(filePath)).rejects.toThrow(TemplateGoblinError)
    await expect(readManifest(filePath)).rejects.toMatchObject({ code: 'INVALID_MANIFEST' })
  })

  it('should preserve manifest data with fonts and groups', async () => {
    const titleField = dynText(
      'title',
      'title',
      true,
      {
        x: 10,
        y: 10,
        width: 200,
        height: 30,
        zIndex: 0,
        groupId: 'grp1',
        label: 'Title',
      },
      undefined,
      'Enter title',
    )

    const manifest = createValidManifest({
      fonts: [{ id: 'font1', name: 'Roboto', filename: 'fonts/roboto.ttf' }],
      groups: [{ id: 'grp1', name: 'Header' }],
      fields: [titleField],
    })
    const zipBuffer = createZipWithManifest(manifest)
    const filePath = join(tmpDir, 'read-manifest-full.tgbl')
    writeFileSync(filePath, zipBuffer)

    const result = await readManifest(filePath)
    expect(result.fonts).toHaveLength(1)
    expect(result.fonts[0]!.id).toBe('font1')
    expect(result.fonts[0]!.name).toBe('Roboto')
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]!.id).toBe('grp1')
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0]!.id).toBe('title')
    const f = result.fields[0]!
    expect(f.source.mode).toBe('dynamic')
    if (f.source.mode === 'dynamic') {
      expect(f.source.required).toBe(true)
      expect(f.source.jsonKey).toBe('title')
    }
  })
})
