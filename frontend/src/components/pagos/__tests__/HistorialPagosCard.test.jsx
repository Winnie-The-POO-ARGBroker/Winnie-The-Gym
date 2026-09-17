import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import HistorialPagosCard from '../HistorialPagosCard'
import * as pagosService from '../../../services/pagosService'

vi.mock('../../../services/pagosService', () => ({
  listarPagos: vi.fn()
}))

describe('HistorialPagosCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no carga pagos si staffOnly es false', () => {
    render(<HistorialPagosCard socioId={1} limit={5} staffOnly={false} />)
    expect(pagosService.listarPagos).not.toHaveBeenCalled()
    expect(screen.getByText(/Sin pagos registrados/i)).toBeInTheDocument()
  })

  it('muestra pagos correctamente cuando se cargan', async () => {
    const pagosMock = [
      { id: 1, plan_nombre: 'Plan Base', estado: 'aprobado', monto: '1000.00', metodo: 'mercado_pago' }
    ]
    pagosService.listarPagos.mockResolvedValueOnce({ results: pagosMock })

    render(<HistorialPagosCard socioId={1} limit={5} staffOnly={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Plan Base')).toBeInTheDocument()
      expect(screen.getByText('$1.000')).toBeInTheDocument()
      expect(screen.getByText('Aprobado')).toBeInTheDocument()
    })
  })

  it('muestra error 403 correctamente', async () => {
    pagosService.listarPagos.mockRejectedValueOnce({ response: { status: 403 } })

    render(<HistorialPagosCard socioId={1} limit={5} staffOnly={true} />)
    
    await waitFor(() => {
      expect(screen.getByText(/No tenés permiso para ver el historial/i)).toBeInTheDocument()
    })
  })
  
  it('muestra error genérico para otros fallos', async () => {
    pagosService.listarPagos.mockRejectedValueOnce({ response: { status: 500 } })

    render(<HistorialPagosCard socioId={1} limit={5} staffOnly={true} />)
    
    await waitFor(() => {
      expect(screen.getByText(/No se pudo cargar el historial/i)).toBeInTheDocument()
    })
  })
})
