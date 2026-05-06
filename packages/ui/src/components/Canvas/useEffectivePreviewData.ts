/**
 * useEffectivePreviewData — single source of truth for the `InputJSON` the
 * canvas (and any other live-preview surface) renders against (#79).
 *
 * Resolution order:
 *   1. If `uiStore.previewJsonText` is non-null AND parses as a valid
 *      `InputJSON` shape, use it. This is the user's pinned data — edits in
 *      the right-panel JSON textarea propagate here on the next render.
 *   2. Otherwise fall back to `generateExampleJson(fields, mode, repeat)`,
 *      the auto-generated example.
 *
 * Mid-edit safety: if the user is mid-typing and the JSON is unparseable,
 * we return the LAST known-good parse (cached in a `useRef`) so the canvas
 * never blanks out. On first paint with an unparseable pin, we fall through
 * to the auto-generated example — a non-blank "no-op" rather than a blank
 * canvas.
 *
 * Pure: no DOM/Fabric dependency. Driven solely by store state + fields.
 */
import { useMemo, useRef } from 'react'
import type { FieldDefinition, InputJSON } from '@template-goblin/types'
import { generateExampleJson } from '../../utils/jsonGenerator.js'
import type { JsonPreviewMode } from '../../store/uiStore.js'

export interface EffectiveDataDeps {
  fields: FieldDefinition[]
  mode: JsonPreviewMode
  repeatCount: number
  /** `previewJsonText` from `uiStore` — `null` means "no user pin". */
  previewJsonText: string | null
}

/**
 * Resolve the `InputJSON` the canvas should render against. The hook is
 * stable: same inputs → same reference, so React's reconciler doesn't
 * re-render fields needlessly.
 */
export function useEffectivePreviewData(deps: EffectiveDataDeps): InputJSON {
  const { fields, mode, repeatCount, previewJsonText } = deps

  // The auto-generated baseline is always available — used both as the
  // fall-through when there's no pin AND as the seed for the last-good cache
  // so a fresh session never starts with a "blank" reference.
  const generated = useMemo(
    () => generateExampleJson(fields, mode, repeatCount) as unknown as InputJSON,
    [fields, mode, repeatCount],
  )

  // Cache the last successfully-parsed pin so a mid-edit unparseable string
  // doesn't blank the canvas. Persists across renders via `useRef`; gets
  // refreshed on every successful parse.
  const lastGoodRef = useRef<InputJSON | null>(null)

  return useMemo(() => {
    if (previewJsonText === null) {
      lastGoodRef.current = null
      return generated
    }
    const parsed = tryParseInputJson(previewJsonText)
    if (parsed) {
      lastGoodRef.current = parsed
      return parsed
    }
    return lastGoodRef.current ?? generated
  }, [previewJsonText, generated])
}

/**
 * Parse a string into an `InputJSON` shape. Returns `null` for invalid
 * JSON or for parsed values that aren't a plain object — callers fall back
 * to the auto-gen baseline. Permissive about missing buckets: the top-level
 * keys default to empty objects so a partial object like `{ "texts": {...} }`
 * is accepted without surfacing a parse error. Exported for unit tests.
 */
export function tryParseInputJson(text: string): InputJSON | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  return {
    texts: (isPlainObject(obj.texts) ? obj.texts : {}) as InputJSON['texts'],
    images: (isPlainObject(obj.images) ? obj.images : {}) as InputJSON['images'],
    tables: (isPlainObject(obj.tables) ? obj.tables : {}) as InputJSON['tables'],
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}
