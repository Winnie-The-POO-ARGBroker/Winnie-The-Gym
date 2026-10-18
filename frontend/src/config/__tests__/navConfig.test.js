import { describe, it, expect } from 'vitest'
import { NAV_CONFIG } from '../navConfig'

const paths = (items) => items.filter((i) => i.path).map((i) => i.path)

describe('NAV_CONFIG administrador', () => {
  // The admin has no socio profile, so the credential page answers 403.
  it.each(['primary', 'more', 'sidebar'])('no ofrece la credencial digital en %s', (section) => {
    expect(paths(NAV_CONFIG.administrador[section])).not.toContain('/socio/credencial')
  })

  it('sigue ofreciendo la vista de reserva de clases', () => {
    expect(paths(NAV_CONFIG.administrador.sidebar)).toContain('/socio/clases')
  })
})

describe('NAV_CONFIG socio', () => {
  it('mantiene la credencial digital', () => {
    expect(paths(NAV_CONFIG.socio.sidebar)).toContain('/socio/credencial')
  })
})
