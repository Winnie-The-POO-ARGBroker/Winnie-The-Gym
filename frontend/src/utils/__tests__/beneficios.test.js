import { describe, it, expect } from 'vitest'
import { normalizarBeneficios } from '../beneficios'

describe('normalizarBeneficios', () => {
  it('turns the plain strings the API stores into included benefits', () => {
    expect(normalizarBeneficios(['Acceso a clases', 'Credencial QR'])).toEqual([
      { texto: 'Acceso a clases', incluido: true },
      { texto: 'Credencial QR', incluido: true },
    ])
  })

  it('keeps the { texto, incluido } objects the plan form edits', () => {
    const items = [{ texto: 'Seguimiento', incluido: false }]

    expect(normalizarBeneficios(items)).toEqual(items)
  })

  it('treats a missing incluido as included', () => {
    expect(normalizarBeneficios([{ texto: 'Pase libre' }])).toEqual([{ texto: 'Pase libre', incluido: true }])
  })

  it('drops blank entries', () => {
    expect(normalizarBeneficios(['', '   ', null, { texto: ' ' }, 'Válido'])).toEqual([
      { texto: 'Válido', incluido: true },
    ])
  })

  it('returns an empty list for anything that is not a list', () => {
    expect(normalizarBeneficios(undefined)).toEqual([])
    expect(normalizarBeneficios(null)).toEqual([])
    expect(normalizarBeneficios('texto')).toEqual([])
  })
})
