import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadTemplate } from '../src/load.js'
import { generateAndStore } from '../src/storage.js'
import type { StorageProvider } from '../src/storage.js'
import type { InputJSON } from '@template-goblin/types'
import { dynText, makeManifest } from './helpers/fixtures.js'

const TEST_DIR = join(tmpdir(), 'tg-storage-test-' + Date.now())

function createTestTgbl(): string {
  const manifest = makeManifest({
    fields: [
      dynText(
        'f1',
        'name',
        false,
        { x: 50, y: 50, width: 200, height: 30, zIndex: 0 },
        undefined,
        'Name',
      ),
    ],
  })

  const zip = new AdmZip()
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)))
  const path = join(TEST_DIR, 'storage-test.tgbl')
  writeFileSync(path, zip.toBuffer())
  return path
}

/** Mock storage provider that stores uploads in memory */
class MockStorage implements StorageProvider {
  uploads: { key: string; buffer: Buffer; contentType: string }[] = []

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    this.uploads.push({ key, buffer, contentType })
    return `https://mock-storage.test/${key}`
  }
}

beforeAll(() => mkdirSync(TEST_DIR, { recursive: true }))
afterAll(() => rmSync(TEST_DIR, { recursive: true, force: true }))

describe('generateAndStore', () => {
  it('should generate a PDF and upload to storage provider', async () => {
    const path = createTestTgbl()
    const template = await loadTemplate(path)
    const storage = new MockStorage()

    const data: InputJSON = { texts: { name: 'Test' }, tables: {}, images: {} }
    const result = await generateAndStore(template, data, storage, { key: 'output.pdf' })

    expect(result.url).toBe('https://mock-storage.test/output.pdf')
    expect(result.size).toBeGreaterThan(0)
    expect(storage.uploads).toHaveLength(1)
    expect(storage.uploads[0]!.contentType).toBe('application/pdf')
    expect(storage.uploads[0]!.buffer.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should prepend prefix to key when provided', async () => {
    const path = createTestTgbl()
    const template = await loadTemplate(path)
    const storage = new MockStorage()

    const data: InputJSON = { texts: { name: 'Test' }, tables: {}, images: {} }
    const result = await generateAndStore(template, data, storage, {
      key: 'report.pdf',
      prefix: 'pdfs/2024/',
    })

    expect(result.url).toBe('https://mock-storage.test/pdfs/2024/report.pdf')
    expect(storage.uploads[0]!.key).toBe('pdfs/2024/report.pdf')
  })

  it('should propagate storage upload errors', async () => {
    const path = createTestTgbl()
    const template = await loadTemplate(path)

    const failingStorage: StorageProvider = {
      upload: async () => {
        throw new Error('Upload failed')
      },
    }

    const data: InputJSON = { texts: { name: 'Test' }, tables: {}, images: {} }
    await expect(
      generateAndStore(template, data, failingStorage, { key: 'fail.pdf' }),
    ).rejects.toThrow('Upload failed')
  })
})
