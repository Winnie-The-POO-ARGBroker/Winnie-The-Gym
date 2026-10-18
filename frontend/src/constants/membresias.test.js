import { describe, it, expect } from 'vitest'
import { membresiaEstadoLabel, membresiaEstadoVariant } from './membresias'

describe('membresia estado helpers', () => {
  it('labels renovada as "Renovada"', () => {
    expect(membresiaEstadoLabel('renovada')).toBe('Renovada')
  })

  it('renders renovada with the neutral badge variant (not an alarm)', () => {
    expect(membresiaEstadoVariant('renovada')).toBe('neutral')
  })

  it('keeps vencida as danger', () => {
    expect(membresiaEstadoVariant('vencida')).toBe('danger')
  })
})
