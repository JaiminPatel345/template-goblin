/**
 * 01-build-tgbl.ts — Programmatically craft a .tgbl template that exercises
 * every field type the SDK supports:
 *
 *  Page 1 (solid #f0f4ff background):
 *    - Static text   "Invoice"                     (title)
 *    - Dynamic text   customer_name                 (filled at PDF time)
 *    - Static image  logo.png                       (baked into the .tgbl)
 *    - Dynamic image customer_photo                 (supplied via InputJSON)
 *    - Dynamic table line_items  (item, qty, price) (supplied via InputJSON)
 *
 *  Page 2 (image background — a gradient PNG):
 *    - Static text   "Thank you for your business!"
 *    - Dynamic text  footer_note
 *
 * Output: examples/output/demo.tgbl
 */
import { saveTemplate } from 'template-goblin'
import type {
  TemplateManifest,
  TemplateAssets,
  TextField,
  ImageField,
  TableField,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
  CellStyle,
  PageDefinition,
} from '@template-goblin/types'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '..', 'output')
const OUTPUT_PATH = join(OUTPUT_DIR, 'demo.tgbl')

// ── Tiny helper images (real valid PNGs) ──────────────────────────────────

/** 1×1 white PNG */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/58BAwAI/AL+hc2rNAAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * Generate a real 100×40 PNG with a blue-to-purple gradient using raw IDAT.
 * This gives us a visible background image without any image library dependency.
 */
function createGradientPng(w: number, h: number): Buffer {
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

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // Raw scanlines (filter byte 0 + RGB per pixel)
  const raw: number[] = []
  for (let y = 0; y < h; y++) {
    raw.push(0) // filter: none
    const t = y / Math.max(h - 1, 1)
    for (let x = 0; x < w; x++) {
      const s = x / Math.max(w - 1, 1)
      const r = Math.round(40 + 80 * s)
      const g = Math.round(80 + 60 * t)
      const b = Math.round(180 + 60 * (1 - t))
      raw.push(r, g, b)
    }
  }

  // Deflate (store-only — no compression, maximum compatibility)
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
  // zlib wrapper: CMF=0x78 FLG=0x01 (no dict, level 0)
  let s1 = 1
  let s2 = 0
  for (let i = 0; i < rawBuf.length; i++) {
    s1 = (s1 + (rawBuf[i] as number)) % 65521
    s2 = (s2 + s1) % 65521
  }
  const adler = ((s2 << 16) | s1) >>> 0
  const adlerBuf = Buffer.alloc(4)
  adlerBuf.writeUInt32BE(adler, 0)
  const zlibData = Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, adlerBuf])

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibData),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** A small 200×80 "logo" PNG */
const LOGO_PNG = createGradientPng(200, 80)

/** A 595×842 gradient image for the page-2 background */
const BG_PAGE2_PNG = createGradientPng(100, 142) // small — PDF stretches it

// ── Styles ─────────────────────────────────────────────────────────────────

const titleStyle: TextFieldStyle = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 28,
  fontSizeDynamic: false,
  fontSizeMin: 12,
  lineHeight: 1.3,
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#1a1a2e',
  align: 'left',
  verticalAlign: 'top',
  maxRows: 1,
  overflowMode: 'truncate',
  snapToGrid: false,
}

const bodyStyle: TextFieldStyle = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 14,
  fontSizeDynamic: false,
  fontSizeMin: 8,
  lineHeight: 1.4,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#333333',
  align: 'left',
  verticalAlign: 'top',
  maxRows: 3,
  overflowMode: 'truncate',
  snapToGrid: false,
}

const footerStyle: TextFieldStyle = {
  ...bodyStyle,
  fontSize: 18,
  fontWeight: 'bold',
  color: '#ffffff',
  align: 'center',
  verticalAlign: 'middle',
}

const imageStyle: ImageFieldStyle = { fit: 'contain' }

const baseCellStyle: CellStyle = {
  fontFamily: 'Helvetica',
  fontSize: 11,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#cccccc',
  paddingTop: 4,
  paddingBottom: 4,
  paddingLeft: 6,
  paddingRight: 6,
  align: 'left',
  verticalAlign: 'top',
}

const tableFieldStyle: TableFieldStyle = {
  maxRows: 20,
  maxColumns: 3,
  multiPage: false,
  showHeader: true,
  headerStyle: {
    ...baseCellStyle,
    fontWeight: 'bold',
    backgroundColor: '#e8eaf6',
    color: '#1a1a2e',
  },
  rowStyle: baseCellStyle,
  oddRowStyle: null,
  evenRowStyle: { backgroundColor: '#f5f5f5' },
  cellStyle: { overflowMode: 'truncate' },
  columns: [
    { key: 'item', label: 'Item', width: 200, style: null, headerStyle: null },
    {
      key: 'qty',
      label: 'Qty',
      width: 60,
      style: { align: 'center' },
      headerStyle: { align: 'center' },
    },
    {
      key: 'price',
      label: 'Price',
      width: 100,
      style: { align: 'right' },
      headerStyle: { align: 'right' },
    },
  ],
}

// ── Pages ──────────────────────────────────────────────────────────────────

const page1: PageDefinition = {
  id: 'page-1',
  index: 0,
  backgroundType: 'color',
  backgroundColor: '#f0f4ff',
  backgroundFilename: null,
}

const page2: PageDefinition = {
  id: 'page-2',
  index: 1,
  backgroundType: 'image',
  backgroundColor: null,
  backgroundFilename: 'backgrounds/page-1.png',
}

// ── Fields ─────────────────────────────────────────────────────────────────

const fields: (TextField | ImageField | TableField)[] = [
  // Page 1 — Invoice header
  {
    id: 'title',
    type: 'text',
    label: 'Invoice Title',
    groupId: null,
    pageId: 'page-1',
    x: 50,
    y: 40,
    width: 300,
    height: 40,
    zIndex: 0,
    style: titleStyle,
    source: { mode: 'static', value: 'INVOICE' },
  },
  {
    id: 'customer_name',
    type: 'text',
    label: 'Customer Name',
    groupId: null,
    pageId: 'page-1',
    x: 50,
    y: 100,
    width: 300,
    height: 25,
    zIndex: 1,
    style: bodyStyle,
    source: { mode: 'dynamic', jsonKey: 'customer_name', required: true, placeholder: 'John Doe' },
  },
  {
    id: 'logo',
    type: 'image',
    label: 'Company Logo',
    groupId: null,
    pageId: 'page-1',
    x: 380,
    y: 30,
    width: 180,
    height: 70,
    zIndex: 2,
    style: imageStyle,
    source: { mode: 'static', value: { filename: 'logo.png' } },
  },
  {
    id: 'customer_photo',
    type: 'image',
    label: 'Customer Photo',
    groupId: null,
    pageId: 'page-1',
    x: 50,
    y: 140,
    width: 80,
    height: 80,
    zIndex: 3,
    style: imageStyle,
    source: {
      mode: 'dynamic',
      jsonKey: 'customer_photo',
      required: false,
      placeholder: { filename: 'placeholder.png' },
    },
  },
  {
    id: 'line_items',
    type: 'table',
    label: 'Line Items',
    groupId: null,
    pageId: 'page-1',
    x: 50,
    y: 250,
    width: 500,
    height: 400,
    zIndex: 4,
    style: tableFieldStyle,
    source: { mode: 'dynamic', jsonKey: 'line_items', required: true, placeholder: null },
  },

  // Page 2 — Thank you
  {
    id: 'thank_you',
    type: 'text',
    label: 'Thank You Message',
    groupId: null,
    pageId: 'page-2',
    x: 50,
    y: 300,
    width: 495,
    height: 50,
    zIndex: 0,
    style: footerStyle,
    source: { mode: 'static', value: 'Thank you for your business!' },
  },
  {
    id: 'footer_note',
    type: 'text',
    label: 'Footer Note',
    groupId: null,
    pageId: 'page-2',
    x: 50,
    y: 370,
    width: 495,
    height: 30,
    zIndex: 1,
    style: { ...footerStyle, fontSize: 12, fontWeight: 'normal' },
    source: {
      mode: 'dynamic',
      jsonKey: 'footer_note',
      required: false,
      placeholder: 'No additional notes',
    },
  },
]

// ── Manifest ───────────────────────────────────────────────────────────────

const manifest: TemplateManifest = {
  version: '1.0',
  meta: {
    name: 'Demo Invoice',
    width: 595,
    height: 842,
    unit: 'pt',
    pageSize: 'A4',
    locked: false,
    maxPages: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  fonts: [],
  groups: [],
  pages: [page1, page2],
  fields,
}

// ── Assets ─────────────────────────────────────────────────────────────────

const assets: TemplateAssets = {
  backgroundImage: null,
  pageBackgrounds: new Map([['page-2', BG_PAGE2_PNG]]),
  fonts: new Map(),
  placeholders: new Map([['placeholder.png', TINY_PNG]]),
  staticImages: new Map([['logo.png', LOGO_PNG]]),
}

// ── Save ───────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  await saveTemplate(manifest, assets, OUTPUT_PATH)
  console.log(`[OK] Saved template: ${OUTPUT_PATH}`)
  console.log(`     Pages: ${manifest.pages.length}`)
  console.log(`     Fields: ${manifest.fields.length}`)
  console.log(`     Static images: ${assets.staticImages.size}`)
  console.log(`     Placeholders: ${assets.placeholders.size}`)
}

main().catch((err) => {
  console.error('[FAIL]', err)
  process.exit(1)
})
