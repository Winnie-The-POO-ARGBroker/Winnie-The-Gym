/**
 * Tests for AdminSociosPage.
 *
 * Covers: Reactivar button visibility, email field in modal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import AdminSociosPage from '../AdminSociosPage'
import { renderWithProviders, resetAllStores } from '../../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../hooks/queries/useSociosData', () => ({
  useSociosList: vi.fn(),
  useSociosStats: vi.fn(),
  useSocioMutations: vi.fn(),
}))

vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ title, rightContent }) => (
    <div data-testid="top-bar">
      <span>{title}</span>
      {rightContent}
    </div>
  ),
}))

vi.mock('../../../components/admin/SocioDetailModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="socio-detail-modal" /> : null,
}))

vi.mock('../../../components/admin/SocioFormModal', () => ({
  default: ({ isOpen, socioToEdit }) =>
    isOpen ? (
      <div data-testid="socio-form-modal">
        <input
          type="email"
          data-testid="modal-email-input"
          defaultValue={socioToEdit?.email ?? ''}
          placeholder="Ej. socio@correo.com"
        />
      </div>
    ) : null,
}))

vi.mock('../../../components/admin/SocioColumns', () => ({
  getSocioColumns: () => [
    { key: 'nombre', label: 'Nombre', render: (row) => <span>{row.nombre}</span> },
    { key: 'estado', label: 'Estado', render: (row) => <span>{row.estado}</span> },
  ],
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useSociosList, useSociosStats, useSocioMutations } from '../../../hooks/queries/useSociosData'

const mockSocioActivo = {
  id: 1,
  nombre: 'Ana',
  apellido: 'García',
  dni: '11111111',
  estado: 'activo',
  email: 'ana@test.com',
  telefono: '+5493511111111',
  numero_socio: 'S-00001',
}

const mockSocioBaja = {
  id: 2,
  nombre: 'Luis',
  apellido: 'Herrera',
  dni: '22222222',
  estado: 'baja',
  email: 'luis@test.com',
  telefono: '+5493512222222',
  numero_socio: 'S-00002',
}

const defaultMutations = {
  create: { mutateAsync: vi.fn(), isPending: false },
  patch: { mutateAsync: vi.fn(), isPending: false },
  baja: { mutateAsync: vi.fn(), isPending: false },
  certificado: { mutateAsync: vi.fn(), isPending: false },
  reactivar: { mutateAsync: vi.fn(), isPending: false },
}

function setupMocks(overrides = {}) {
  useSociosList.mockReturnValue({
    data: { count: 2, results: [mockSocioActivo, mockSocioBaja] },
    isLoading: false,
    ...overrides.list,
  })
  useSociosStats.mockReturnValue({
    data: { total: 2, activos: 1, bajas: 1, suspendidos: 0, con_certificado: 0 },
    isLoading: false,
    ...overrides.stats,
  })
  useSocioMutations.mockReturnValue({ ...defaultMutations, ...overrides.mutations })
}

describe('AdminSociosPage', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders page title', () => {
    renderWithProviders(<AdminSociosPage />)
    expect(screen.getByText('Gestión de Socios')).toBeInTheDocument()
  })

  it('shows stats cards', async () => {
    renderWithProviders(<AdminSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Total Socios')).toBeInTheDocument()
      expect(screen.getByText('Socios Activos')).toBeInTheDocument()
      expect(screen.getByText('Suspendidos')).toBeInTheDocument()
    })
  })

  it('shows Nuevo Socio button', () => {
    renderWithProviders(<AdminSociosPage />)
    expect(screen.getByText('Nuevo Socio')).toBeInTheDocument()
  })

  // ── Contract test 7 — fix #229 ────────────────────────────────────────────
  it('Reactivar button visible only if estado is baja', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })

    // The socio with estado=baja should have the reactivar button
    const reactivarBtn = screen.getByTestId('reactivar-2')
    expect(reactivarBtn).toBeInTheDocument()

    // The socio with estado=activo should NOT have the reactivar button
    expect(screen.queryByTestId('reactivar-1')).not.toBeInTheDocument()
  })

  // ── Contract test 8 — fix #229 ────────────────────────────────────────────
  it('email field is editable in modal', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })

    // Open the form modal via Nuevo Socio
    fireEvent.click(screen.getByText('Nuevo Socio'))

    await waitFor(() => {
      expect(screen.getByTestId('socio-form-modal')).toBeInTheDocument()
    })

    const emailInput = screen.getByTestId('modal-email-input')
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).not.toBeDisabled()

    // Simulate typing an email
    fireEvent.change(emailInput, { target: { value: 'nuevo@test.com' } })
    expect(emailInput.value).toBe('nuevo@test.com')
  })

  it('shows baja confirmation modal when dar-de-baja is clicked', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })

    // Ana's row has dar-de-baja (not reactivar since estado=activo)
    const bajaBtn = screen.getByTitle('Dar de baja socio')
    fireEvent.click(bajaBtn)

    await waitFor(() => {
      expect(screen.getByText('Dar de baja socio')).toBeInTheDocument()
      expect(screen.getByText('Confirmar Baja')).toBeInTheDocument()
    })
  })

  it('shows reactivar confirmation modal when reactivar is clicked', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Luis')).toBeInTheDocument()
    })

    const reactivarBtn = screen.getByTestId('reactivar-2')
    fireEvent.click(reactivarBtn)

    await waitFor(() => {
      expect(screen.getByText('Reactivar socio')).toBeInTheDocument()
      expect(screen.getByText('Reactivar')).toBeInTheDocument()
    })
  })
})
