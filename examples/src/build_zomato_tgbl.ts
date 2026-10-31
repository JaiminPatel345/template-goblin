import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from '../../packages/core/node_modules/adm-zip/adm-zip.js'
import type { TemplateManifest } from '@template-goblin/types'
import { validateManifest } from 'template-goblin/validateManifest'
import { loadTemplate, generatePDF } from 'template-goblin'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// Source assets
const LOGO_SRC =
  '/home/jaimin/.gemini/antigravity-cli/brain/68b57c8c-28f4-4c2f-afe4-046181935dd2/.user_uploaded/uploaded_media_1_1793443691574.png'
const FONT_REGULAR_SRC = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
const FONT_BOLD_SRC = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'

const logoBytes = readFileSync(LOGO_SRC)
const fontRegBytes = readFileSync(FONT_REGULAR_SRC)
const fontBoldBytes = readFileSync(FONT_BOLD_SRC)

// 1. Read and validate manifest
const manifestPath = resolve(ROOT_DIR, 'examples/src/zomato_manifest.json')
const manifestRaw = readFileSync(manifestPath, 'utf-8')
const manifest: TemplateManifest = JSON.parse(manifestRaw)

validateManifest(manifest)
console.log('Manifest is valid!')

// 2. Assemble .tgbl ZIP
const zip = new AdmZip()
zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))
zip.addFile('images/zomato-logo.png', logoBytes)
zip.addFile('zomato-logo.png', logoBytes)
zip.addFile('fonts/LiberationSans.ttf', fontRegBytes)
zip.addFile('fonts/LiberationSans-Bold.ttf', fontBoldBytes)

const tgblBuffer = zip.toBuffer()

const dests = [
  resolve(ROOT_DIR, 'examples/tgbl_files/zomato-invoice.tgbl'),
  resolve(ROOT_DIR, 'examples/output/zomato-invoice.tgbl'),
  resolve(ROOT_DIR, 'packages/ui/public/examples/zomato-invoice.tgbl'),
  resolve(ROOT_DIR, 'packages/site/public/examples/zomato-invoice.tgbl'),
]

for (const dest of dests) {
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, tgblBuffer)
  console.log('Wrote .tgbl to:', dest)
}

// 3. Test loading and generating PDF
const loaded = await loadTemplate(dests[0])
const sampleData = {
  texts: {
    order_id: '39536',
    order_time: '14 June 2024, 09:52 AM',
    restaurant_name: 'Sree Anandha Bhavans Restaurant',
    restaurant_address: 'VHQW+8XF,Chinnakada,Kollam',
    customer_name: 'Jithin Baby',
    customer_address: 'Waterfront by Palmyra,Kadavil Jothi,Uliyakovil,Kollam',
    delivery_charge: '₹30',
    taxes: '₹30',
    total: '₹660',
  },
  tables: {
    items: [
      { item: 'Poori Set', quantity: '2', unit_price: '₹125', total_price: '₹250' },
      { item: 'Ghee Roast', quantity: '1', unit_price: '₹100', total_price: '₹100' },
      { item: 'Idiappam Set', quantity: '1', unit_price: '₹125', total_price: '₹125' },
      { item: 'Appam Set', quantity: '1', unit_price: '₹125', total_price: '₹125' },
    ],
  },
}

const pdf = await generatePDF(loaded, sampleData)
const pdfPath = resolve(ROOT_DIR, 'examples/output/zomato-invoice.pdf')
writeFileSync(pdfPath, pdf)
console.log('SUCCESS! Wrote test PDF to:', pdfPath, `(${pdf.length} bytes)`)
