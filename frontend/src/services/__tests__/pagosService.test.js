import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolverInitPoint } from '../pagosService'

/**
 * Tests para resolverInitPoint — función pura que selecciona la URL de pago
 * correcta según la variable de entorno VITE_MP_SANDBOX.
 */

const PREFERENCIA = {
  init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=REAL',
  sandbox_init_point: 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=SANDBOX',
}

describe('resolverInitPoint', () => {
  beforeEach(() => {
    // Aseguramos un entorno limpio antes de cada test
    vi.stubEnv('VITE_MP_SANDBOX', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('retorna init_point real cuando VITE_MP_SANDBOX no está definido', () => {
    vi.stubEnv('VITE_MP_SANDBOX', '')
    const url = resolverInitPoint(PREFERENCIA)
    expect(url).toBe(PREFERENCIA.init_point)
  })

  it('retorna init_point real cuando VITE_MP_SANDBOX=false', () => {
    vi.stubEnv('VITE_MP_SANDBOX', 'false')
    const url = resolverInitPoint(PREFERENCIA)
    expect(url).toBe(PREFERENCIA.init_point)
  })

  it('retorna sandbox_init_point cuando VITE_MP_SANDBOX=true', () => {
    vi.stubEnv('VITE_MP_SANDBOX', 'true')
    const url = resolverInitPoint(PREFERENCIA)
    expect(url).toBe(PREFERENCIA.sandbox_init_point)
  })

  it('cae al init_point real si sandbox=true pero sandbox_init_point está vacío', () => {
    vi.stubEnv('VITE_MP_SANDBOX', 'true')
    const preferenciaSinSandbox = {
      init_point: PREFERENCIA.init_point,
      sandbox_init_point: '',
    }
    const url = resolverInitPoint(preferenciaSinSandbox)
    expect(url).toBe(PREFERENCIA.init_point)
  })
})
