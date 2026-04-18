import { isSafeKey } from './safeKey.js'

/**
 * Resolve a dot-notation key against a data object.
 * Protected against prototype pollution — rejects any path segment that is not
 * a safe identifier (see `isSafeKey`), including `__proto__`, `constructor`,
 * `prototype`, `hasOwnProperty`, `toString`, `valueOf`.
 *
 * @param data - The root data object
 * @param jsonKey - Dot-notation path (e.g., "texts.name")
 * @returns The value at the path, or undefined if not found
 */
export function resolveKey(data: Record<string, unknown>, jsonKey: string): unknown {
  if (!jsonKey || typeof jsonKey !== 'string') return undefined

  const parts = jsonKey.split('.')
  let current: unknown = data

  for (const part of parts) {
    if (!isSafeKey(part)) return undefined
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    if (!Object.prototype.hasOwnProperty.call(current, part)) return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}
