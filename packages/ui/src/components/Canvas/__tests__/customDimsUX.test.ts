import { describe, it, expect } from 'vitest'
import { validateCustomDims, resolveChoice } from '../PageSizePicker.js'

describe('Custom page size input validation and empty string UX', () => {
  it('validates empty string width as required error', () => {
    const res = validateCustomDims('', 842)
    expect(res.widthError).toBe('Width is required.')
    expect(res.heightError).toBeNull()
    expect(res.hasError).toBe(true)
  })

  it('validates empty string height as required error', () => {
    const res = validateCustomDims(595, '')
    expect(res.widthError).toBeNull()
    expect(res.heightError).toBe('Height is required.')
    expect(res.hasError).toBe(true)
  })

  it('validates 0 as sub-1 pt error', () => {
    const res = validateCustomDims(0, 842)
    expect(res.widthError).toBe('Width must be at least 1 pt.')
    expect(res.hasError).toBe(true)
  })

  it('validates negative numbers as sub-1 pt error', () => {
    const res = validateCustomDims(595, -50)
    expect(res.heightError).toBe('Height must be at least 1 pt.')
    expect(res.hasError).toBe(true)
  })

  it('validates positive numbers as valid without error', () => {
    const res = validateCustomDims(595, 842)
    expect(res.widthError).toBeNull()
    expect(res.heightError).toBeNull()
    expect(res.hasError).toBe(false)
  })

  it('resolveChoice safely converts empty string custom dims to 0', () => {
    const choice = resolveChoice('custom', '', 842)
    expect(choice.pageSize).toBe('custom')
    expect(choice.width).toBe(0)
    expect(choice.height).toBe(842)
  })
})
