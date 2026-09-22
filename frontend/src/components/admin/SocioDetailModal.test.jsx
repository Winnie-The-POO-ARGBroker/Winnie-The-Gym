/**
 * Tests for SocioDetailModal.
 *
 * Satisfies REQ-3.1 (≥ 12 tests).
 * Mocked: useMembresiasPorSocio, usePagosPorSocio
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import SocioDetailModal from './SocioDetailModal'
import { renderWithProviders, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/queries/useMembresias', () => ({
  useMembresiasPorSocio: vi.fn(),
}))

vi.mock('../../hooks/queries/usePagos', () => ({
  usePagosPorSocio: vi.fn(),
}))

vi.mock('../ui/Modal', () => ({
  default: ({ isOpen, onClose, children }) =>
    isOpen ? (
      <div data-testid="modal">
        <button onClick={onClose} aria-label="Cerrar detalle">X</button>
        {children}
      </div>
    ) : null,
}))

import { useMembresiasPorSocio } from '../../hooks/queries/useMembresias'
import { usePagosPorSocio } from '../../hooks/queries/usePagos'

const mockSocio = {
  id: 1,
  nombre: 'María',
  apellido: 'González',
  dni: '44556677',
  telefono: '3411234567',
  estado: 'activo',
  numero_socio: 42,
  certificado_medico_url: null,
  observaciones: null,
  created_at: '2024-01-15T10:00:00Z',
  fecha_baja: null,
}

const mockMembresias = [
  { id: 1, plan_nombre: 'Premium', estado: 'activa', fecha_inicio: '2024-01-01', fecha_fin: '2024-02-01' },
]

const mockPagos = [
  { id: 1, plan_nombre: 'Premium', estado: 'aprobado', monto: 8000, created_at: '2024-01-01', metodo: 'efectivo' },
]

function setupHooks() {
  useMembresiasPorSocio.mockReturnValue({ data: mockMembresias, isPending: false })
  usePagosPorSocio.mockReturnValue({ data: mockPagos, isPending: false })
}

describe('SocioDetailModal', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupHooks()
  })

  // ── 1. Nothing visible when isOpen=false ──────────────────────────────────
  it('renders nothing when isOpen is false', () => {
    renderWithProviders(
      <SocioDetailModal isOpen={false} onClose={vi.fn()} socio={mockSocio} />,
    )

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  // ── 2. Nothing visible when socio is null ────────────────────────────────
  it('renders nothing when socio is null', () => {
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={null} />,
    )

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  // ── 3. Socio name visible when isOpen=true ────────────────────────────────
  it('displays socio name when isOpen=true and valid socio is passed', async () => {
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={mockSocio} />,
    )

    await waitFor(() => {
      expect(screen.getByText('María González')).toBeInTheDocument()
    })
  })

  // ── 4. Socio number is displayed ──────────────────────────────────────────
  it('displays socio number', async () => {
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={mockSocio} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Socio Nº 42/)).toBeInTheDocument()
    })
  })

  // ── 5. Datos tab shows DNI ────────────────────────────────────────────────
  it('shows DNI in datos tab', async () => {
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={mockSocio} />,
    )

    await waitFor(() => {
      expect(screen.getByText('44556677')).toBeInTheDocument()
    })
  })

  // ── 6. Datos tab shows phone ──────────────────────────────────────────────
  it('shows telefono in datos tab', async () => {
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={mockSocio} />,
    )

    await waitFor(() => {
      expect(screen.getByText('3411234567')).toBeInTheDocument()
    })
  })

  // ── 7. No certificado message ─────────────────────────────────────────────
  it('shows "no certificado" message when certificado_medico_url is null', async () => {
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={mockSocio} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/No posee certificado médico/i)).toBeInTheDocument()
    })
  })

  // ── 8. Certificado link when present ─────────────────────────────────────
  it('shows "Certificado vigente cargado" when certificado_medico_url is present', async () => {
    const socioWithCert = { ...mockSocio, certificado_medico_url: 'https://cdn/cert.pdf' }
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={socioWithCert} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Certificado vigente cargado/i)).toBeInTheDocument()
    })
  })

  // ── 9. Close button (X) calls onClose ────────────────────────────────────
  it('calls onClose when X close button is clicked', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={onClose} socio={mockSocio} />,
    )

    await waitFor(() => {
      // The modal mock renders an X button that calls onClose
      expect(screen.getByText('X')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('X'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  // ── 10. Footer "Cerrar" button calls onClose ──────────────────────────────
  it('footer "Cerrar" button calls onClose', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={onClose} socio={mockSocio} />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalled()
  })

  // ── 11. Switching to Membresías tab shows data ────────────────────────────
  it('shows membership data in membresías tab', async () => {
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={mockSocio} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Membresías')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Membresías'))

    await waitFor(() => {
      expect(screen.getByText('Premium')).toBeInTheDocument()
    })
  })

  // ── 12. Switching to Pagos tab shows payment data ─────────────────────────
  it('shows payment data in pagos tab', async () => {
    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={mockSocio} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Pagos')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Pagos'))

    await waitFor(() => {
      expect(screen.getByText('aprobado')).toBeInTheDocument()
    })
  })

  // ── 13. "Editar Datos" button calls onEditar ──────────────────────────────
  it('calls onEditar when "Editar Datos" is clicked', async () => {
    const onEditar = vi.fn()
    const onClose = vi.fn()

    renderWithProviders(
      <SocioDetailModal
        isOpen={true}
        onClose={onClose}
        socio={mockSocio}
        onEditar={onEditar}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Editar Datos')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Editar Datos'))

    expect(onClose).toHaveBeenCalled()
    expect(onEditar).toHaveBeenCalledWith(mockSocio)
  })

  // ── 14. Empty membresías state ────────────────────────────────────────────
  it('shows empty state in membresías tab when no membresias', async () => {
    useMembresiasPorSocio.mockReturnValue({ data: [], isPending: false })

    renderWithProviders(
      <SocioDetailModal isOpen={true} onClose={vi.fn()} socio={mockSocio} />,
    )

    fireEvent.click(screen.getByText('Membresías'))

    await waitFor(() => {
      expect(screen.getByText(/No hay membresías registradas/i)).toBeInTheDocument()
    })
  })
})
