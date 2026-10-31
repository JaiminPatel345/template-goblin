import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadExampleFromSearch } from '../useExampleLoader.js'
import * as saveOpen from '../../utils/saveOpen.js'

describe('loadExampleFromSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when no example or template parameter is present', async () => {
    const openSpy = vi.spyOn(saveOpen, 'openTemplate').mockResolvedValue()
    const result = await loadExampleFromSearch('')
    expect(result).toBe(false)
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('fetches and opens template when ?example= is present', async () => {
    const openSpy = vi.spyOn(saveOpen, 'openTemplate').mockResolvedValue()
    const mockBlob = new Blob(['fake zip content'])

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    })
    vi.stubGlobal('fetch', fetchSpy)

    const result = await loadExampleFromSearch('?example=zomato-invoice.tgbl', '/playground/')
    expect(result).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith('/playground/examples/zomato-invoice.tgbl')
    expect(openSpy).toHaveBeenCalled()

    const firstCall = openSpy.mock.calls[0]
    expect(firstCall).toBeDefined()
    const passedFile = firstCall![0]
    expect(passedFile.name).toBe('zomato-invoice.tgbl')
  })

  it('falls back to secondary URL if the primary one fails', async () => {
    const openSpy = vi.spyOn(saveOpen, 'openTemplate').mockResolvedValue()
    const mockBlob = new Blob(['fake zip content'])

    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })
    vi.stubGlobal('fetch', fetchSpy)

    const result = await loadExampleFromSearch('?example=zomato-invoice.tgbl', '/playground/')
    expect(result).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(openSpy).toHaveBeenCalled()
  })

  it('returns false and logs warning if all URLs fail', async () => {
    const openSpy = vi.spyOn(saveOpen, 'openTemplate').mockResolvedValue()
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchSpy)

    const result = await loadExampleFromSearch('?example=missing.tgbl')
    expect(result).toBe(false)
    expect(openSpy).not.toHaveBeenCalled()
  })
})
