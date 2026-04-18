import type { TemplateManifest } from './template.js'

/** Assets extracted from a .tgbl file for saving/creating */
export interface TemplateAssets {
  /** Legacy single background image (page 0) */
  backgroundImage: Buffer | null
  /** Per-page background images keyed by page ID */
  pageBackgrounds: Map<string, Buffer>
  fonts: Map<string, Buffer>
  /** Placeholder images for dynamic image fields, keyed by filename (e.g. "logo.png"). */
  placeholders: Map<string, Buffer>
  /** Baked-in image files for static image fields, keyed by filename. */
  staticImages: Map<string, Buffer>
}

/** Returned by loadTemplate(). Everything in memory, ready for fast PDF generation. */
export interface LoadedTemplate {
  manifest: TemplateManifest
  /** Legacy single background image (page 0) */
  backgroundImage: Buffer | null
  /** Per-page background images keyed by page ID */
  pageBackgrounds: Map<string, Buffer>
  fonts: Map<string, Buffer>
  /** Placeholder images for dynamic image fields, keyed by filename. */
  placeholders: Map<string, Buffer>
  /** Baked-in image files for static image fields, keyed by filename. */
  staticImages: Map<string, Buffer>
}
