import { describe, it, expect } from 'vitest'
import { generateDaysAgenda } from '../agenda'

describe('generateDaysAgenda', () => {
  it('returns exactly 7 days', () => {
    const days = generateDaysAgenda()
    expect(days).toHaveLength(7)
  })

  it('first day is today (esHoy: true)', () => {
    const days = generateDaysAgenda()
    expect(days[0].esHoy).toBe(true)
  })

  it('subsequent days are not today (esHoy: false)', () => {
    const days = generateDaysAgenda()
    for (let i = 1; i < 7; i++) {
      expect(days[i].esHoy).toBe(false)
    }
  })

  it('each day has required fields', () => {
    const days = generateDaysAgenda()
    days.forEach((day) => {
      expect(day).toHaveProperty('id')
      expect(day).toHaveProperty('diaNombre')
      expect(day).toHaveProperty('diaNumero')
      expect(day).toHaveProperty('fechaCompleta')
      expect(day).toHaveProperty('esHoy')
    })
  })

  it('id is in YYYY-MM-DD format', () => {
    const days = generateDaysAgenda()
    days.forEach((day) => {
      expect(day.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it('diaNumero is zero-padded', () => {
    const days = generateDaysAgenda()
    days.forEach((day) => {
      expect(day.diaNumero).toMatch(/^\d{2}$/)
    })
  })

  it('fechaCompleta contains the day name and number', () => {
    const days = generateDaysAgenda()
    const first = days[0]
    expect(first.fechaCompleta).toContain(first.diaNombre)
    expect(first.fechaCompleta).toContain(first.diaNumero)
  })

  it('days are consecutive starting from today', () => {
    const days = generateDaysAgenda()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 7; i++) {
      const expected = new Date(today)
      expected.setDate(today.getDate() + i)
      const expectedId = expected.toISOString().split('T')[0]
      expect(days[i].id).toBe(expectedId)
    }
  })
})
