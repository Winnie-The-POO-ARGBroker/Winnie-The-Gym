/**
 * Tests for AdminSociosPage.
 *
 * Satisfies REQ-2.2 (≥ 14 tests).
 * Mocked: useSociosList, useSociosStats, useSocioMutations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import AdminSociosPage from './AdminSociosPage'
import { renderWithProviders, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/queries/useSociosData', () => ({
  useSociosList: vi.fn(),
  useSociosStats: vi.fn(),
  useSocioMutations: vi.fn(),
}))

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../../components/layout/TopBar', () => ({
  default: ({ title, rightContent }) => (
    <div>
      <h1>{title}</h1>
      {rightContent}
    </div>
  ),
}))

vi.mock('../../components/admin/SocioFormModal', () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="socio-form-modal">SocioFormModal</div> : null,
}))

vi.mock('../../components/admin/SocioDetailModal', () => ({
  default: ({ isOpen, socio }) =>
    isOpen && socio ? <div data-testid="socio-detail-modal">{socio.nombre}</div> : null,
}))

vi.mock('../../components/admin/SocioColumns', () => ({
  getSocioColumns: () => [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'estado', label: 'Estado' },
  ],
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { useSociosList, useSociosStats, useSocioMutations } from '../../hooks/queries/useSociosData'

const mockSocios = [
  { id: 1, nombre: 'Ana', apellido: 'García', estado: 'activo', dni: '11111111' },
  { id: 2, nombre: 'Carlos', apellido: 'López', estado: 'activo', dni: '22222222' },
  { id: 3, nombre: 'Beatriz', apellido: 'Martínez', estado: 'baja', dni: '33333333' },
]

const defaultMutations = {
  create: { mutateAsync: vi.fn(), isLoading: false },
  patch: { mutateAsync: vi.fn(), isLoading: false },
  baja: { mutateAsync: vi.fn(), isLoading: false, isPending: false },
  certificado: { mutateAsync: vi.fn(), isLoading: false },
}

const defaultStats = {
  total: 3,
  activos: 2,
  con_certificado: 1,
  bajas: 1,
}

function setupMocks(overrides = {}) {
  useSociosList.mockReturnValue({
    data: { count: 3, results: mockSocios },
    isLoading: false,
    ...overrides.list,
  })
  useSociosStats.mockReturnValue({
    data: defaultStats,
    isLoading: false,
    ...overrides.stats,
  })
  useSocioMutations.mockReturnValue({
    ...defaultMutations,
    ...overrides.mutations,
  })
}

describe('AdminSociosPage', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Renders page title ──────────────────────────────────────────────────
  it('renders page title "Gestión de Socios"', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Gestión de Socios')).toBeInTheDocument()
    })
  })

  // ── 2. Socios names appear in table ───────────────────────────────────────
  it('renders socios names when query resolves', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
      expect(screen.getByText('Carlos')).toBeInTheDocument()
    })
  })

  // ── 3. Loading indicator when query is pending ────────────────────────────
  it('shows loading skeleton when socios query is loading', async () => {
    setupMocks({ list: { data: undefined, isLoading: true } })

    renderWithProviders(<AdminSociosPage />)

    // The table shows skeleton rows when loading
    await waitFor(() => {
      const cells = document.querySelectorAll('td')
      expect(cells.length).toBeGreaterThan(0)
    })
  })

  // ── 4. Empty state when no socios ─────────────────────────────────────────
  it('shows empty state when socios list is empty', async () => {
    setupMocks({ list: { data: { count: 0, results: [] }, isLoading: false } })

    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText(/sin socios/i)).toBeInTheDocument()
    })
  })

  // ── 5. Stats KPI cards render ─────────────────────────────────────────────
  it('renders KPI cards with stats from backend', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Total Socios')).toBeInTheDocument()
      expect(screen.getByText('Socios Activos')).toBeInTheDocument()
    })
  })

  // ── 6. Stats loading shows "..." ─────────────────────────────────────────
  it('shows "..." for stats while stats are loading', async () => {
    setupMocks({ stats: { data: undefined, isLoading: true } })

    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getAllByText('...').length).toBeGreaterThan(0)
    })
  })

  // ── 7. "Nuevo Socio" button is present ────────────────────────────────────
  it('renders "Nuevo Socio" button', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Nuevo Socio')).toBeInTheDocument()
    })
  })

  // ── 8. Clicking "Nuevo Socio" opens form modal ───────────────────────────
  it('opens SocioFormModal when "Nuevo Socio" is clicked', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Nuevo Socio')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Nuevo Socio'))

    expect(screen.getByTestId('socio-form-modal')).toBeInTheDocument()
  })

  // ── 9. Confirmation modal appears for baja action ─────────────────────────
  it('shows baja confirmation modal when delete button is clicked', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })

    // Click the delete (baja) button for the first active socio
    const bajaButtons = screen.getAllByTitle('Dar de baja socio')
    fireEvent.click(bajaButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Dar de baja socio/i)).toBeInTheDocument()
    })
  })

  // ── 10. Baja mutation called on confirm ───────────────────────────────────
  it('calls baja mutation when confirm button is clicked in modal', async () => {
    const bajaFn = vi.fn().mockResolvedValue({})
    setupMocks({ mutations: { baja: { mutateAsync: bajaFn, isLoading: false, isPending: false } } })

    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })

    // Click baja button for first socio
    const bajaButtons = screen.getAllByTitle('Dar de baja socio')
    fireEvent.click(bajaButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Confirmar Baja')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Confirmar Baja'))

    await waitFor(() => {
      expect(bajaFn).toHaveBeenCalledWith(mockSocios[0].id)
    })
  })

  // ── 11. Clicking row opens detail modal ───────────────────────────────────
  it('opens SocioDetailModal when a row is clicked', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })

    // Click the eye (view detail) button
    const eyeButtons = screen.getAllByTitle('Ver detalle')
    fireEvent.click(eyeButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('socio-detail-modal')).toBeInTheDocument()
    })
  })

  // ── 12. Column headers are rendered ──────────────────────────────────────
  it('renders table column headers', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Nombre')).toBeInTheDocument()
      expect(screen.getByText('Apellido')).toBeInTheDocument()
      expect(screen.getByText('Estado')).toBeInTheDocument()
    })
  })

  // ── 13. Socio with estado=baja has no delete button ──────────────────────
  it('does not show delete button for socios with estado=baja', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Beatriz')).toBeInTheDocument()
    })

    const bajaButtons = screen.getAllByTitle('Dar de baja socio')
    // Only 2 socios have estado !== 'baja' (Ana and Carlos)
    expect(bajaButtons.length).toBe(2)
  })

  // ── 14. Search bar is present ─────────────────────────────────────────────
  it('renders search bar', async () => {
    renderWithProviders(<AdminSociosPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument()
    })
  })
})
