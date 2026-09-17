import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import CobroManualPage from '../CobroManualPage'
import api from '../../../services/api'
import * as pagosService from '../../../services/pagosService'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  }
}))

vi.mock('../../../services/pagosService', () => ({
  cobrarManual: vi.fn(),
  listarPagos: vi.fn()
}))

// Mock de useDebounce para evitar timers en tests
vi.mock('../../../hooks/useDebounce', () => ({
  default: (val) => val
}))

describe('CobroManualPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock inicial de planes
    api.get.mockImplementation((url) => {
      if (url === '/memberships/planes/') {
        return Promise.resolve({ data: [{ id: 1, nombre: 'Plan Mensual', precio: '1000.00', activo: true, duracion_dias: 30 }] })
      }
      if (url === '/members/socios/') {
        return Promise.resolve({ data: [{ id: 1, nombre: 'Juan', apellido: 'Perez', dni: '12345678', numero_socio: 'S-0001' }] })
      }
      return Promise.resolve({ data: [] })
    })
    
    pagosService.listarPagos.mockResolvedValue({ results: [] })
  })

  it('renderiza correctamente y carga planes', async () => {
    render(
      <MemoryRouter>
        <CobroManualPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Plan Mensual/i)).toBeInTheDocument()
    })
  })

  it('permite buscar y seleccionar un socio con teclado', async () => {
    render(
      <MemoryRouter>
        <CobroManualPage />
      </MemoryRouter>
    )
    
    const input = screen.getByPlaceholderText(/Ej: Juan García o 30123456/i)
    fireEvent.change(input, { target: { value: 'Juan' } })
    
    // Espera que aparezca la sugerencia
    await waitFor(() => {
      expect(screen.getByText(/Juan Perez/i)).toBeInTheDocument()
    })
    
    // Simular teclado
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    // El chip de socio debe aparecer
    await waitFor(() => {
      expect(screen.getByText(/Socio #S-0001/i)).toBeInTheDocument()
    })
  })
})
