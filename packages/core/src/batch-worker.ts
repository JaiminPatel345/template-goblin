/**
 * Worker script for batch PDF generation.
 *
 * Receives a serialized LoadedTemplate + InputJSON via IPC,
 * generates a PDF, and sends the result back as base64.
 */

import type { InputJSON } from '@template-goblin/types'
import { deserializeTemplate } from './batch.js'
import { generatePDF } from './generate.js'

process.on(
  'message',
  async (msg: { template: Parameters<typeof deserializeTemplate>[0]; data: InputJSON }) => {
    try {
      const template = deserializeTemplate(msg.template)
      const pdf = await generatePDF(template, msg.data)
      process.send?.({ success: true, pdf: pdf.toString('base64') })
    } catch (err) {
      process.send?.({ success: false, error: err instanceof Error ? err.message : 'Worker error' })
    } finally {
      process.exit(0)
    }
  },
)
