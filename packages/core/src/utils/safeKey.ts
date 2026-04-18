/**
 * Returns true iff `key` is a valid InputJSON bucket key: matches the standard
 * JS identifier regex AND is not one of JavaScript's prototype-polluting or
 * inherited Object.prototype property names. Blocklist covers `__proto__`,
 * `constructor`, `prototype`, `hasOwnProperty`, `toString`, `valueOf` so that a
 * hostile manifest cannot coerce `bucket[key]` into walking the prototype
 * chain and returning a native function in place of user data.
 *
 * @param key - Candidate key string.
 * @returns `true` when the key is safe to use as a bucket lookup; `false` otherwise.
 */
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

const UNSAFE_KEYS = new Set<string>([
  '__proto__',
  'constructor',
  'prototype',
  'hasOwnProperty',
  'toString',
  'valueOf',
])

export function isSafeKey(key: string): boolean {
  if (typeof key !== 'string') return false
  if (!IDENTIFIER_RE.test(key)) return false
  if (UNSAFE_KEYS.has(key)) return false
  return true
}
