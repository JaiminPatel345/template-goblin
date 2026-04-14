import type { TemplateManifest } from './template.js'

/** Assets extracted from a .tgbl file for saving/creating */
export interface TemplateAssets {
  backgroundImage: Buffer | null
  fonts: Map<string, Buffer>
  placeholders: Map<string, Buffer>
}

/** Returned by loadTemplate(). Everything in memory, ready for fast PDF generation. */
export interface LoadedTemplate {
  manifest: TemplateManifest
  backgroundImage: Buffer | null
  fonts: Map<string, Buffer>
  placeholders: Map<string, Buffer>
}
