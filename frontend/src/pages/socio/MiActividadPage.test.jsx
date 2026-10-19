import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MiActividadPage from './MiActividadPage'
import { useMiActividad } from '../../hooks/queries/useAccessLogs'

vi.mock('../../components/layout/MemberLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))
vi.mock('../../hooks/queries/useAccessLogs', () => ({ useMiActividad: vi.fn() }))

// Shape returned by GET /api/access/me/actividad/ (flat DRF page + resumen).
const RESPONSE = {
  count: 2,
  resumen: { accesos_mes: 1, rechazos_mes: 1, ultimo_acceso: '2026-10-18T15:00:00Z' },
  results: [
    { id: 1, timestamp: '2026-10-18T15:00:00Z', access_type: 'ENTRY', status: 'GRANTED' },
    {
      id: 2,
      timestamp: '2026-10-18T14:00:00Z',
      access_type: 'ENTRY',
      status: 'DENIED',
      denial_reason: 'YA_FIGURA_ADENTRO',
    },
  ],
}

describe('MiActividadPage', () => {
  it('lists the access logs returned by the API', () => {
    useMiActividad.mockReturnValue({ data: RESPONSE, isLoading: false })
    render(<MiActividadPage />)
    expect(screen.queryByText('Sin movimientos')).toBeNull()
    expect(screen.getByText('Permitido')).toBeTruthy()
    expect(screen.getByText('Denegado')).toBeTruthy()
  })

  it('labels movements in Spanish instead of the raw access type', () => {
    useMiActividad.mockReturnValue({ data: RESPONSE, isLoading: false })
    render(<MiActividadPage />)
    expect(screen.getAllByText(/Entrada/).length).toBe(2)
    expect(screen.queryByText(/ENTRY/)).toBeNull()
  })
})
