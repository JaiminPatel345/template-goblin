import type { FieldDefinition } from '@template-goblin/types'

/**
 * Estimate the approximate PDF file size based on template contents.
 *
 * This is a rough estimate — actual PDF size depends on font embedding,
 * image compression, and content complexity.
 *
 * @param fields - Template fields
 * @param hasBackground - Whether a background image is present
 * @param backgroundSize - Size of background image in bytes
 * @returns Estimated size string (e.g., "~450 KB")
 */
export function estimatePdfSize(
  fields: FieldDefinition[],
  hasBackground: boolean,
  backgroundSize: number = 0,
): string {
  // Base PDF overhead
  let bytes = 5000

  // Background image (typically the largest part)
  if (hasBackground) {
    bytes += backgroundSize || 100000
  }

  // Per field estimates
  for (const field of fields) {
    switch (field.type) {
      case 'text':
        bytes += 500
        break
      case 'image':
        bytes += 50000
        break
      case 'table': {
        const rows = field.style.maxRows || 10
        const cols = field.style.columns?.length || 3
        bytes += rows * cols * 200
        break
      }
    }
  }

  return formatBytes(bytes)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `~${bytes} B`
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
