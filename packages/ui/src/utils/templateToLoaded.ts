/**
 * templateToLoaded — adapter that maps the UI's in-memory `templateStore`
 * state into the `LoadedTemplate` shape `template-goblin`'s `generatePDF`
 * accepts. Lives in the UI side so the core stays source-of-truth for the
 * shape; this file is a thin transformation.
 *
 * The two halves of the input:
 *   1. The manifest pieces — `meta`, `fields`, `pages`, `groups`, `fonts`
 *      metadata. These flow through with the manifest version `'1.0'` (matches
 *      `saveOpen.saveTemplate`).
 *   2. The asset buffers — `pageBackgroundBuffers`, `placeholderBuffers`,
 *      `staticImageBuffers`, `fontBuffers`, plus the legacy single-page
 *      `backgroundBuffer`. The UI stores these as `ArrayBuffer`; core needs
 *      `Buffer`. We wrap with `Buffer.from(...)` (polyfilled in the browser
 *      via `vite-plugin-node-polyfills`).
 */
import { Buffer } from 'buffer'
import { collectReferencedImageAssets } from 'template-goblin/assetRefs'
import type {
  FieldDefinition,
  FontDefinition,
  GroupDefinition,
  LoadedTemplate,
  PageBand,
  PageDefinition,
  PageNumberConfig,
  TemplateManifest,
  TemplateMeta,
} from '@template-goblin/types'

export interface TemplateStoreSnapshot {
  meta: TemplateMeta
  fields: FieldDefinition[]
  pages: PageDefinition[]
  groups: GroupDefinition[]
  fonts: FontDefinition[]
  backgroundBuffer: ArrayBuffer | null
  pageBackgroundBuffers: Map<string, ArrayBuffer>
  fontBuffers: Map<string, ArrayBuffer>
  placeholderBuffers: Map<string, ArrayBuffer>
  staticImageBuffers: Map<string, ArrayBuffer>
  // #61 — page-wide header / footer / page-number config; forwarded to the
  // renderer so the preview / generated PDF show the same bands the editor
  // canvas draws.
  header?: PageBand
  footer?: PageBand
  pageNumber?: PageNumberConfig
}

/**
 * Build a `LoadedTemplate` from the UI store snapshot. Pure — no React, no
 * store reads. The caller (typically `PreviewDialog`) supplies a snapshot
 * via `useTemplateStore.getState()` so this stays straightforward to test.
 */
export function templateToLoaded(state: TemplateStoreSnapshot): LoadedTemplate {
  // Filter out malformed fields the same way `saveTemplate` does — a missing
  // `source` only happens when an old persisted blob rehydrates, and would
  // make `validateManifest` reject the template at preview time.
  const fields = state.fields.filter((f) => !!f.source)

  // #61 — drop band fields that lost their `source` for the same reason
  // body fields do; otherwise the renderer's validateManifest would reject
  // the whole template.
  const sanitizeBand = (band: PageBand | undefined): PageBand | undefined =>
    band ? { ...band, fields: band.fields.filter((f) => !!f.source) } : band

  const manifest: TemplateManifest = {
    version: '1.0',
    meta: state.meta,
    fonts: state.fonts,
    groups: state.groups,
    pages: state.pages,
    fields,
    header: sanitizeBand(state.header),
    footer: sanitizeBand(state.footer),
    pageNumber: state.pageNumber,
  }

  const backgroundImage = state.backgroundBuffer ? toBuffer(state.backgroundBuffer) : null

  // The image pools are append-only during a session and may carry
  // orphans (deleted / replaced / mode-flipped fields). Hand the
  // renderer only what the manifest references — same sweep the .tgbl
  // writers do — and skip the Buffer copy for dead entries.
  const imageRefs = collectReferencedImageAssets(manifest)

  return {
    manifest,
    backgroundImage,
    pageBackgrounds: mapBuffers(state.pageBackgroundBuffers),
    fonts: mapBuffers(state.fontBuffers),
    placeholders: mapBuffers(state.placeholderBuffers, imageRefs.placeholders),
    staticImages: mapBuffers(state.staticImageBuffers, imageRefs.staticImages),
  }
}

/** ArrayBuffer → Node-style `Buffer`. Required by PDFKit and core's renderers. */
function toBuffer(ab: ArrayBuffer): Buffer {
  return Buffer.from(ab)
}

/** Copy a pool to `Buffer`s, optionally keeping only `keep` members. */
function mapBuffers(src: Map<string, ArrayBuffer>, keep?: Set<string>): Map<string, Buffer> {
  const out = new Map<string, Buffer>()
  for (const [k, v] of src) {
    if (keep && !keep.has(k)) continue
    out.set(k, toBuffer(v))
  }
  return out
}
