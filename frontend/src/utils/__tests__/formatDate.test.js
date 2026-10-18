import { describe, it, expect } from 'vitest'
import { formatISO, formatFecha, getTimeAgo, hoyISO, parseFecha } from '../formatDate'

describe('formatISO', () => {
  it('formats a Date object to YYYY-MM-DD', () => {
    const result = formatISO(new Date('2026-09-20T12:00:00Z'))
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('formats an ISO string to YYYY-MM-DD', () => {
    const result = formatISO('2026-09-20T12:00:00Z')
    expect(result).toBe('2026-09-20')
  })
})

describe('formatFecha', () => {
  it('returns — for null', () => {
    expect(formatFecha(null)).toBe('—')
  })

  it('returns — for undefined', () => {
    expect(formatFecha(undefined)).toBe('—')
  })

  it('formats a valid ISO date string', () => {
    const result = formatFecha('2026-09-20')
    expect(result).toContain('2026')
  })

  it('uses provided locale', () => {
    const result = formatFecha('2026-01-15', 'en-US')
    expect(result).toBeTruthy()
  })
})

describe('getTimeAgo', () => {
  it('returns "hace un momento" for < 1 minute', () => {
    const now = new Date()
    const date = new Date(now.getTime() - 30 * 1000) // 30 seconds ago
    expect(getTimeAgo(date.toISOString(), now)).toBe('hace un momento')
  })

  it('returns "hace 1 minuto" for exactly 1 minute', () => {
    const now = new Date()
    const date = new Date(now.getTime() - 60 * 1000)
    expect(getTimeAgo(date.toISOString(), now)).toBe('hace 1 minuto')
  })

  it('returns "hace N minutos" for < 1 hour', () => {
    const now = new Date()
    const date = new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes
    expect(getTimeAgo(date.toISOString(), now)).toBe('hace 30 minutos')
  })

  it('returns "hace 1 hora" for exactly 1 hour', () => {
    const now = new Date()
    const date = new Date(now.getTime() - 60 * 60 * 1000)
    expect(getTimeAgo(date.toISOString(), now)).toBe('hace 1 hora')
  })

  it('returns "hace N horas" for < 24 hours', () => {
    const now = new Date()
    const date = new Date(now.getTime() - 5 * 60 * 60 * 1000) // 5 hours
    expect(getTimeAgo(date.toISOString(), now)).toBe('hace 5 horas')
  })

  it('returns "hace 1 día" for exactly 1 day', () => {
    const now = new Date()
    const date = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    expect(getTimeAgo(date.toISOString(), now)).toBe('hace 1 día')
  })

  it('returns "hace N días" for > 1 day', () => {
    const now = new Date()
    const date = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days
    expect(getTimeAgo(date.toISOString(), now)).toBe('hace 3 días')
  })
})

describe('hoyISO', () => {
  it('uses the Argentina calendar day, not the UTC one, late in the evening', () => {
    // 17 Oct 2026 23:30 ART is already 18 Oct 02:30 UTC.
    expect(hoyISO(new Date('2026-10-18T02:30:00Z'))).toBe('2026-10-17')
  })

  it('matches UTC during the day', () => {
    expect(hoyISO(new Date('2026-10-17T15:00:00Z'))).toBe('2026-10-17')
  })
})

describe('parseFecha', () => {
  it('keeps the calendar day of a date-only string whatever the browser timezone', () => {
    const d = parseFecha('2026-10-17')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 17])
  })

  it('parses full timestamps as instants', () => {
    expect(parseFecha('2026-10-17T12:00:00Z').toISOString()).toBe('2026-10-17T12:00:00.000Z')
  })
})

describe('formatFecha with date-only strings', () => {
  it('shows the same day the API sent', () => {
    expect(formatFecha('2026-10-17')).toBe('17/10/2026')
  })
})
