import { useEffect, useRef } from 'react'
import { openTemplate } from '../utils/saveOpen.js'
import { useTemplateStore } from '../store/templateStore.js'

/**
 * Parses URL search params and attempts to fetch + open an example template.
 * Returns true if a template was successfully loaded, false otherwise.
 */
export async function loadExampleFromSearch(
  search: string,
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<boolean> {
  const params = new URLSearchParams(search)
  const exampleParam = params.get('example') || params.get('template')
  if (!exampleParam) return false

  // Ensure IDB hydration finishes first if active
  if (!useTemplateStore.persist.hasHydrated()) {
    await new Promise<void>((resolve) => {
      const unsub = useTemplateStore.persist.onFinishHydration(() => {
        unsub()
        resolve()
      })
    })
  }

  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const candidateUrls =
    exampleParam.startsWith('http://') || exampleParam.startsWith('https://')
      ? [exampleParam]
      : [
          `${cleanBase}examples/${exampleParam}`,
          `/examples/${exampleParam}`,
          `examples/${exampleParam}`,
        ]

  let res: Response | null = null
  for (const url of candidateUrls) {
    try {
      const attempt = await fetch(url)
      if (attempt.ok) {
        res = attempt
        break
      }
    } catch {
      // Fall through to next candidate URL
    }
  }

  if (!res || !res.ok) {
    console.warn(`[useExampleLoader] Could not fetch example template: ${exampleParam}`)
    return false
  }

  const blob = await res.blob()
  const rawName = exampleParam.split('/').pop() || 'example.tgbl'
  const filename = rawName.endsWith('.tgbl') ? rawName : `${rawName}.tgbl`
  const file = new File([blob], filename, { type: 'application/octet-stream' })
  await openTemplate(file)
  return true
}

/**
 * Automatically loads a template into the editor when the URL contains
 * an `?example=<filename>` or `?template=<url>` query parameter.
 */
export function useExampleLoader(): void {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    void loadExampleFromSearch(window.location.search).catch((err: unknown) => {
      console.error('[useExampleLoader] Failed to open example template:', err)
    })
  }, [])
}
