import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTemplate, generatePDF } from 'template-goblin'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// Load the template ONCE (parses ZIP, fonts, images into memory)
const templatePath = resolve(ROOT_DIR, 'examples/tgbl_files/zomato-invoice.tgbl')
const template = await loadTemplate(templatePath)

// Dynamic JSON data matching the template keys
const data = {
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

const pdf = await generatePDF(template, data)
const outputPath = resolve(ROOT_DIR, 'examples/output/zomato-invoice.pdf')
await writeFile(outputPath, pdf)
console.log('Successfully generated Zomato invoice PDF at:', outputPath)
