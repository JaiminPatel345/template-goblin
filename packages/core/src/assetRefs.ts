import type { TemplateManifest } from '@template-goblin/types'
import { allManifestFields } from './utils/manifestFields.js'

/**
 * Referenced-image-asset collection — the mark phase of the .tgbl
 * writers' mark-and-sweep.
 *
 * Image bytes live in filename-keyed pools (`placeholders` for dynamic
 * fields' preview bitmaps, `staticImages` for static fields' baked-in
 * assets). Editors treat those pools as APPEND-ONLY while a session is
 * open: deleting bytes eagerly when a field is removed or its image
 * replaced would break undo (history snapshots capture fields, not
 * bytes — restoring a deleted field must find its image still there)
 * and risks dropping an asset another field still references by the
 * same filename.
 *
 * Instead, orphans are swept at the serialization boundary: writers
 * call `collectReferencedImageAssets(manifest)` and persist only pool
 * entries the manifest actually references, so a `.tgbl` never carries
 * dead bytes no matter how much the session churned.
 *
 * Pure and dependency-free — safe for both the Node and browser builds.
 */
export interface ReferencedImageAssets {
  /** Keys into the `placeholders` pool referenced by dynamic image fields. */
  placeholders: Set<string>
  /** Keys into the `staticImages` pool referenced by static image fields. */
  staticImages: Set<string>
}

/** Archive directory for dynamic-image placeholder bitmaps. */
const PLACEHOLDERS_PREFIX = 'placeholders/'
/** Archive directory for static-image assets. */
const IMAGES_PREFIX = 'images/'

/**
 * Collect every image filename the manifest's fields (body + header /
 * footer bands) reference, per pool.
 *
 * Pool keys and field references are inconsistent about carrying the
 * archive directory prefix (`dp.png` vs `placeholders/dp.png`) — both
 * spellings have always been accepted by the writers and loaders. Each
 * returned set therefore contains BOTH forms of every reference, so
 * callers can test membership with whatever form their pool keys use:
 * `refs.placeholders.has(poolKey)`.
 */
export function collectReferencedImageAssets(
  manifest: Pick<TemplateManifest, 'fields' | 'header' | 'footer'>,
): ReferencedImageAssets {
  const refs: ReferencedImageAssets = { placeholders: new Set(), staticImages: new Set() }

  for (const field of allManifestFields(manifest)) {
    if (field.type !== 'image' || !field.source) continue
    if (field.source.mode === 'dynamic') {
      addRef(refs.placeholders, filenameOf(field.source.placeholder), PLACEHOLDERS_PREFIX)
    } else {
      addRef(refs.staticImages, filenameOf(field.source.value), IMAGES_PREFIX)
    }
  }
  return refs
}

function filenameOf(value: unknown): string | null {
  if (value && typeof value === 'object' && 'filename' in value) {
    const filename = (value as { filename: unknown }).filename
    if (typeof filename === 'string' && filename.length > 0) return filename
  }
  return null
}

/** Add a reference in both its bare and directory-prefixed spellings. */
function addRef(set: Set<string>, name: string | null, dir: string): void {
  if (!name) return
  set.add(name)
  if (name.startsWith(dir)) set.add(name.slice(dir.length))
  else set.add(dir + name)
}
