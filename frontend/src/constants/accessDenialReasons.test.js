import { describe, it, expect } from 'vitest'
import { ACCESS_DENIAL_REASONS } from './accessDenialReasons'

// Codes the backend can send in AccessLog.denial_reason (backend/apps/access/models.py).
const BACKEND_CODES = [
  'TOKEN_EXPIRED', 'INVALID_SIGNATURE', 'INVALID_TOKEN', 'REPLAY_ATTACK', 'MEMBERSHIP_INACTIVE',
  'NO_MEMBERSHIP', 'USER_SUSPENDED', 'UNKNOWN_USER', 'AFORO_FULL', 'NOT_INSIDE',
  'YA_FIGURA_ADENTRO', 'NO_FIGURA_ADENTRO', 'YA_REGISTRADO', 'AFORO_COMPLETO', 'FUERA_DE_HORARIO',
  'PLAN_FUERA_DE_HORARIO', 'PLAN_DIA_NO_HABILITADO', 'GYM_CERRADO',
]

describe('ACCESS_DENIAL_REASONS', () => {
  it.each(BACKEND_CODES)('tiene un texto legible para %s', (code) => {
    expect(ACCESS_DENIAL_REASONS[code]).toEqual(expect.any(String))
    expect(ACCESS_DENIAL_REASONS[code].length).toBeGreaterThan(3)
  })

  it('no repite el mismo texto en dos códigos: el filtro del historial se vería duplicado', () => {
    const textos = Object.values(ACCESS_DENIAL_REASONS)
    expect(new Set(textos).size).toBe(textos.length)
  })
})

