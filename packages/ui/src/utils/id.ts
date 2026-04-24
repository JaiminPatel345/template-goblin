/**
 * Generates a secure unique identifier using crypto.randomUUID().
 *
 * @param prefix Optional prefix to prepend to the ID (e.g., 'font-', 'group-').
 * @returns A cryptographically secure unique identifier string.
 */
export function generateSecureId(prefix = ''): string {
  return `${prefix}${crypto.randomUUID()}`
}
