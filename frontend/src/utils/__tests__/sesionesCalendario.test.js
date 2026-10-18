import { describe, it, expect } from 'vitest'
import { combinarSesionesConClases } from '../sesionesCalendario'

const CLASE = {
  id: 7, nombre: 'Spinning', sala: 'Sala A', categoria: 'spinning',
  hora: '09:00', cupo_maximo: 20, cupos_reservados: 3, dia: 'Lunes', dias_recurrencia: ['L', 'X'],
}

describe('combinarSesionesConClases', () => {
  it('lleva nombre, sala y categoría de la clase a cada sesión', () => {
    const [item] = combinarSesionesConClases(
      [{ id: 100, clase: 7, fecha: '2026-10-19', estado: 'programada', hora_efectiva: '09:00', cupo_efectivo: 20 }],
      [CLASE],
    )
    expect(item).toMatchObject({ nombre: 'Spinning', sala: 'Sala A', categoria: 'spinning', fecha: '2026-10-19' })
  })

  it('mantiene el id de la clase (para abrir su detalle) y guarda el de la sesión aparte', () => {
    const [item] = combinarSesionesConClases([{ id: 100, clase: 7, fecha: '2026-10-19', estado: 'programada' }], [CLASE])
    expect(item.id).toBe(7)
    expect(item.sesion_id).toBe(100)
  })

  it('usa la hora y el cupo efectivos de la sesión cuando tiene overrides', () => {
    const [item] = combinarSesionesConClases(
      [{ id: 100, clase: 7, fecha: '2026-10-19', estado: 'programada', hora_efectiva: '18:30', cupo_efectivo: 12 }],
      [CLASE],
    )
    expect(item.hora).toBe('18:30')
    expect(item.cupo_maximo).toBe(12)
  })

  it('toma el estado de la sesión, no el de la clase', () => {
    const [item] = combinarSesionesConClases(
      [{ id: 100, clase: 7, fecha: '2026-10-19', estado: 'cancelada' }],
      [{ ...CLASE, estado: 'activa' }],
    )
    expect(item.estado).toBe('cancelada')
  })

  it('descarta las sesiones cuya clase no se conoce', () => {
    expect(combinarSesionesConClases([{ id: 1, clase: 99, fecha: '2026-10-19' }], [CLASE])).toEqual([])
  })
})
