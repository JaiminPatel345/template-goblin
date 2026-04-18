/**
 * Re-export of `isSafeKey` from the shared types package. The implementation
 * lives in `@template-goblin/types/safeKey` so the UI can validate user-typed
 * `jsonKey` strings against the same rule before persisting them.
 */
export { isSafeKey } from '@template-goblin/types'
