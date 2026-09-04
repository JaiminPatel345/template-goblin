/**
 * useProjectedPreviewData — the `InputJSON` the canvas renders against.
 *
 * A pure memo over `projectFieldsToJson`: the canvas previews exactly what
 * the fields' placeholders say, the same state the sidebar edits and the
 * JSON panel projects. (Pre-refactor this hook resolved a user-pinned JSON
 * string with parse caching — the pin is gone; see `jsonProjection.ts`.)
 *
 * `images` is intentionally empty: the canvas resolves image bitmaps from
 * the store's buffers via `useImageResolver`, never from the JSON.
 */
import { useMemo } from 'react'
import type { FieldDefinition, InputJSON } from '@template-goblin/types'
import { projectFieldsToJson } from '../../utils/jsonProjection.js'

export interface ProjectedPreviewDeps {
  fields: FieldDefinition[]
  /** #61 — header/footer band fields contribute their dynamic jsonKeys to
   *  the same flat `texts`/`tables` buckets the body fields use. */
  headerFields?: FieldDefinition[]
  footerFields?: FieldDefinition[]
}

export function useProjectedPreviewData(deps: ProjectedPreviewDeps): InputJSON {
  const { fields, headerFields, footerFields } = deps
  return useMemo(() => {
    const projected = projectFieldsToJson(fields, { header: headerFields, footer: footerFields })
    return {
      texts: projected.texts,
      images: {},
      tables: projected.tables,
      links: projected.links,
      ...(projected.condition ? { condition: projected.condition } : {}),
      ...(projected.conditions ? { conditions: projected.conditions } : {}),
    }
  }, [fields, headerFields, footerFields])
}
