import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadTemplate } from '../src/load.js'
import { generateBatchPDF } from '../src/batch.js'
import type { InputJSON } from '@template-goblin/types'

const TEST_DIR = join(tmpdir(), 'tg-batch-test-' + Date.now())

function createTestTgbl(): string {
  const manifest = {
    version: '1.0',
    meta: {
      name: 'Batch Test',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    fonts: [],
    groups: [],
    fields: [
      {
        id: 'f1',
        type: 'text',
        groupId: null,
        required: true,
        jsonKey: 'texts.name',
        placeholder: 'Name',
        x: 50,
        y: 50,
        width: 200,
        height: 30,
        zIndex: 0,
        style: {
          fontId: null,
          fontFamily: 'Helvetica',
          fontSize: 12,
          fontSizeDynamic: false,
          fontSizeMin: 6,
          lineHeight: 1.2,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#000000',
          align: 'left',
          verticalAlign: 'top',
          maxRows: 1,
          overflowMode: 'truncate',
          snapToGrid: true,
        },
      },
    ],
  }

  const zip = new AdmZip()
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)))
  const path = join(TEST_DIR, 'batch-test.tgbl')
  writeFileSync(path, zip.toBuffer())
  return path
}

beforeAll(() => mkdirSync(TEST_DIR, { recursive: true }))
afterAll(() => rmSync(TEST_DIR, { recursive: true, force: true }))

describe('generateBatchPDF', () => {
  it('should generate multiple PDFs in-process (parallel=false)', async () => {
    const path = createTestTgbl()
    const template = await loadTemplate(path)

    const dataArray: InputJSON[] = [
      { texts: { name: 'Alice' }, loops: {}, images: {} },
      { texts: { name: 'Bob' }, loops: {}, images: {} },
      { texts: { name: 'Charlie' }, loops: {}, images: {} },
    ]

    const results = await generateBatchPDF(template, dataArray, { parallel: false })

    expect(results).toHaveLength(3)
    for (const r of results) {
      expect(r.success).toBe(true)
      expect(r.pdf).toBeInstanceOf(Buffer)
      expect(r.pdf!.toString('utf-8', 0, 5)).toBe('%PDF-')
    }
  })

  it('should report progress via onProgress callback', async () => {
    const path = createTestTgbl()
    const template = await loadTemplate(path)

    const dataArray: InputJSON[] = [
      { texts: { name: 'A' }, loops: {}, images: {} },
      { texts: { name: 'B' }, loops: {}, images: {} },
    ]

    const progressCalls: [number, number][] = []
    await generateBatchPDF(template, dataArray, {
      parallel: false,
      onProgress: (done, total) => progressCalls.push([done, total]),
    })

    expect(progressCalls).toEqual([
      [1, 2],
      [2, 2],
    ])
  })

  it('should handle errors in individual items without failing the batch', async () => {
    const path = createTestTgbl()
    const template = await loadTemplate(path)

    const dataArray: InputJSON[] = [
      { texts: { name: 'Valid' }, loops: {}, images: {} },
      { texts: {}, loops: {}, images: {} }, // Missing required field
    ]

    const results = await generateBatchPDF(template, dataArray, { parallel: false })

    expect(results[0]!.success).toBe(true)
    expect(results[1]!.success).toBe(false)
    expect(results[1]!.error).toBeDefined()
  })

  it('should handle a single-item batch', async () => {
    const path = createTestTgbl()
    const template = await loadTemplate(path)

    const results = await generateBatchPDF(template, [
      { texts: { name: 'Solo' }, loops: {}, images: {} },
    ])

    expect(results).toHaveLength(1)
    expect(results[0]!.success).toBe(true)
  })

  it('should handle an empty batch', async () => {
    const path = createTestTgbl()
    const template = await loadTemplate(path)

    const results = await generateBatchPDF(template, [])
    expect(results).toHaveLength(0)
  })
})
