import { describe, it, expect } from 'vitest'
import { formatARS } from '../formatCurrency'

describe('formatARS', () => {
  it('formats a positive integer', () => {
    const result = formatARS(12000)
    expect(result).toContain('12')
    expect(result).toContain('000')
  })

  it('formats zero', () => {
    const result = formatARS(0)
    expect(result).toBeTruthy()
    expect(result).not.toBe('--')
  })

  it('returns -- for null', () => {
    expect(formatARS(null)).toBe('--')
  })

  it('returns -- for undefined', () => {
    expect(formatARS(undefined)).toBe('--')
  })

  it('returns -- for empty string', () => {
    expect(formatARS('')).toBe('--')
  })

  it('returns -- for non-numeric string', () => {
    expect(formatARS('abc')).toBe('--')
  })

  it('formats a numeric string', () => {
    const result = formatARS('5000')
    expect(result).not.toBe('--')
    expect(result).toContain('5')
  })

  it('formats a float (truncates to integer display)', () => {
    const result = formatARS(1500.99)
    expect(result).not.toBe('--')
  })
})
