/**
 * Resolve a dot-notation key against a data object.
 *
 * @param data - The root data object
 * @param jsonKey - Dot-notation path (e.g., "texts.name")
 * @returns The value at the path, or undefined if not found
 */
export function resolveKey(data: Record<string, unknown>, jsonKey: string): unknown {
  const parts = jsonKey.split('.')
  let current: unknown = data
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}
