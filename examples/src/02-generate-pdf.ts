/**
 * 02-generate-pdf.ts — Load the .tgbl built by step 01, supply runtime data
 * via InputJSON, and generate a real PDF file you can open and visually verify.
 *
 * Coverage exercised:
 *   - loadTemplate() reads the .tgbl ZIP and hydrates all assets
 *   - generatePDF() renders:
 *       • static text  ("INVOICE")
 *       • dynamic text (customer_name, footer_note)
 *       • static image (logo.png baked into the archive)
 *       • dynamic image (customer_photo supplied as Buffer)
 *       • dynamic table (line_items with 5 rows)
 *   - Multi-page: page 1 has a solid color bg, page 2 has an image bg
 *   - The resulting buffer starts with %PDF and can be opened in any viewer
 */
import { loadTemplate, generatePDF } from 'template-goblin'
import type { InputJSON } from '@template-goblin/types'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '..', 'output')
const TGBL_PATH = join(OUTPUT_DIR, 'demo.tgbl')
const PDF_PATH = join(OUTPUT_DIR, 'demo.pdf')

/** Generate a small 50×50 red PNG to use as the dynamic customer photo. */
function createRedSquarePng(): Buffer {
  function crc32(buf: Buffer): number {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i] as number
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
    }
    return (c ^ 0xffffffff) >>> 0
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeB = Buffer.from(type, 'ascii')
    const crcBuf = Buffer.concat([typeB, data])
    const crcVal = Buffer.alloc(4)
    crcVal.writeUInt32BE(crc32(crcBuf), 0)
    return Buffer.concat([len, typeB, data, crcVal])
  }

  const w = 50,
    h = 50
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2

  const raw: number[] = []
  for (let y = 0; y < h; y++) {
    raw.push(0) // filter: none
    for (let x = 0; x < w; x++) {
      raw.push(200, 60, 60) // red-ish
    }
  }
  const rawBuf = Buffer.from(raw)

  const blocks: Buffer[] = []
  const BLOCK = 65535
  for (let i = 0; i < rawBuf.length; i += BLOCK) {
    const end = Math.min(i + BLOCK, rawBuf.length)
    const last = end === rawBuf.length ? 1 : 0
    const slice = rawBuf.subarray(i, end)
    const hdr = Buffer.alloc(5)
    hdr[0] = last
    hdr.writeUInt16LE(slice.length, 1)
    hdr.writeUInt16LE(~slice.length & 0xffff, 3)
    blocks.push(hdr, slice)
  }

  let s1 = 1,
    s2 = 0
  for (let i = 0; i < rawBuf.length; i++) {
    s1 = (s1 + (rawBuf[i] as number)) % 65521
    s2 = (s2 + s1) % 65521
  }
  const adlerBuf = Buffer.alloc(4)
  adlerBuf.writeUInt32BE(((s2 << 16) | s1) >>> 0, 0)
  const zlibData = Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, adlerBuf])

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibData),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function main() {
  console.log(`Loading template: ${TGBL_PATH}`)
  const template = await loadTemplate(TGBL_PATH)

  console.log(`  Manifest: ${template.manifest.meta.name}`)
  console.log(`  Pages: ${template.manifest.pages.length}`)
  console.log(`  Fields: ${template.manifest.fields.length}`)
  console.log(`  Fonts: ${template.fonts.size}`)
  console.log(`  Static images: ${template.staticImages.size}`)
  console.log(`  Page backgrounds: ${template.pageBackgrounds.size}`)

  const data: InputJSON = {
    texts: {
      customer_name: 'Acme Corporation — Jane Smith',
      footer_note: 'Payment due within 30 days. Thank you!',
    },
    images: {
      customer_photo: createRedSquarePng(),
    },
    tables: {
      line_items: [
        { item: 'Widget Pro (Annual License)', qty: '2', price: '$1,200.00' },
        { item: 'Setup & Integration Fee', qty: '1', price: '$500.00' },
        { item: 'Premium Support (12 months)', qty: '1', price: '$300.00' },
        { item: 'Custom Branding Package', qty: '1', price: '$150.00' },
        { item: 'Data Migration Service', qty: '1', price: '$800.00' },
      ],
    },
  }

  console.log(`\nGenerating PDF...`)
  const pdfBuffer = await generatePDF(template, data)

  writeFileSync(PDF_PATH, pdfBuffer)
  console.log(`[OK] PDF written: ${PDF_PATH}`)
  console.log(`     Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`)

  // Sanity checks
  const header = pdfBuffer.subarray(0, 5).toString('ascii')
  if (header !== '%PDF-') {
    console.error('[FAIL] Output does not start with %PDF- header!')
    process.exit(1)
  }
  console.log(`     Header: ${header} (valid PDF)`)
  console.log(`\nOpen ${PDF_PATH} in any PDF viewer to verify the output.`)
}

main().catch((err) => {
  console.error('[FAIL]', err)
  process.exit(1)
})
