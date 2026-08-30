import 'fake-indexeddb/auto'
import { afterEach, vi } from 'vitest'

afterEach(async () => {
  vi.clearAllTimers()
  vi.restoreAllMocks()
  // Flush pending microtasks & IndexedDB transactions before worker teardown
  await new Promise((resolve) => setTimeout(resolve, 0))
})
