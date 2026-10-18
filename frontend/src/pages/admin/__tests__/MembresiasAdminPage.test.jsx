/**
 * Test 15 (contract): MembresiasAdminPage > suspender shows modal with motivo required
 * #188 — Lifecycle UI
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MembresiasAdminPage from '../MembresiasAdminPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../hooks/queries/useMembresias', () => ({
  useMembresiasAdmin: vi.fn(),
  useSuspenderMembresiaMutation: vi.fn(),
  useReactivarMembresiaMutation: vi.fn(),
  useCancelarMembresiaMutation: vi.fn(),
  useRenovarMembresiaMutation: vi.fn(),
}))

vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ title }) => <h1>{title}</h1>,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import {
  useMembresiasAdmin,
  useSuspenderMembresiaMutation,
  useReactivarMembresiaMutation,
  useCancelarMembresiaMutation,
  useRenovarMembresiaMutation,
} from '../../../hooks/queries/useMembresias'

const mockMembresiaActiva = {
  id: 1,
  socio: 10,
  socio_nombre: 'Ana García',
  plan_nombre: 'Plan Mensual',
  estado: 'activa',
  fecha_inicio: '2026-09-01',
  fecha_fin: '2026-10-01',
}

const mockMutate = vi.fn()
const mockMutation = { mutate: mockMutate, isPending: false }

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MembresiasAdminPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('MembresiasAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMembresiasAdmin.mockReturnValue({
      data: { results: [mockMembresiaActiva], count: 1 },
      isLoading: false,
      isError: false,
    })
    useSuspenderMembresiaMutation.mockReturnValue(mockMutation)
    useReactivarMembresiaMutation.mockReturnValue(mockMutation)
    useCancelarMembresiaMutation.mockReturnValue(mockMutation)
    useRenovarMembresiaMutation.mockReturnValue(mockMutation)
  })

  it('renders page title', () => {
    renderPage()
    expect(screen.getByText('Membresías')).toBeInTheDocument()
  })

  it('offers "Renovada" in the estado filter', () => {
    renderPage()
    expect(screen.getByRole('option', { name: 'Renovada' })).toBeInTheDocument()
  })

  it('shows Renovada badge without a Renovar action for a renovada row', () => {
    useMembresiasAdmin.mockReturnValue({
      data: { results: [{ ...mockMembresiaActiva, estado: 'renovada' }], count: 1 },
      isLoading: false,
      isError: false,
    })
    renderPage()
    expect(screen.getAllByText('Renovada').length).toBeGreaterThan(0)
    expect(screen.queryByText('Renovar')).not.toBeInTheDocument()
    expect(screen.queryByText('Suspender')).not.toBeInTheDocument()
  })

  it('still shows Renovar for a vencida row', () => {
    useMembresiasAdmin.mockReturnValue({
      data: { results: [{ ...mockMembresiaActiva, estado: 'vencida' }], count: 1 },
      isLoading: false,
      isError: false,
    })
    renderPage()
    expect(screen.getByText('Renovar')).toBeInTheDocument()
  })

  it('displays a membresia row with socio name', () => {
    renderPage()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('shows suspender button for activa membresia', () => {
    renderPage()
    expect(screen.getByText('Suspender')).toBeInTheDocument()
  })

  it('suspender opens modal with motivo input', async () => {
    renderPage()

    const suspenderBtn = screen.getByText('Suspender')
    fireEvent.click(suspenderBtn)

    await waitFor(() => {
      expect(screen.getByText('Suspender membresía')).toBeInTheDocument()
    })

    expect(screen.getByTestId('motivo-input')).toBeInTheDocument()
  })

  it('suspender modal confirm button is disabled when motivo is empty', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Suspender'))

    await waitFor(() => {
      expect(screen.getByText('Suspender membresía')).toBeInTheDocument()
    })

    const confirmarBtn = screen.getByText('Confirmar')
    expect(confirmarBtn).toBeDisabled()
  })

  it('suspender modal confirm enables after typing motivo', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Suspender'))

    await waitFor(() => {
      expect(screen.getByTestId('motivo-input')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('motivo-input'), { target: { value: 'Morosidad' } })

    const confirmarBtn = screen.getByText('Confirmar')
    expect(confirmarBtn).not.toBeDisabled()
  })

  it('suspender confirm calls mutation with motivo', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Suspender'))

    await waitFor(() => {
      expect(screen.getByTestId('motivo-input')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('motivo-input'), { target: { value: 'Falta de pago' } })
    fireEvent.click(screen.getByText('Confirmar'))

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, motivo: 'Falta de pago' })
    )
  })

  it('shows filters for estado', () => {
    renderPage()
    expect(screen.getByText('Todos los estados')).toBeInTheDocument()
  })

  it('shows cancelar button for activa membresia', () => {
    renderPage()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })
})
