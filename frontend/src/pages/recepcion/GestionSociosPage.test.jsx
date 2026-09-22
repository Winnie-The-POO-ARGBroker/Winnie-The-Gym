/**
 * Tests for GestionSociosPage (recepcion role).
 *
 * Satisfies REQ-2.4 (≥ 10 tests).
 * Mocked: useSociosList, useSocioMutations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import GestionSociosPage from './GestionSociosPage'
import { renderWithProviders, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/queries/useSociosData', () => ({
  useSociosList: vi.fn(),
  useSocioMutations: vi.fn(),
}))

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('../../components/layout/TopBar', () => ({
  default: ({ title, rightContent }) => (
    <div>
      <h1>{title}</h1>
      {rightContent}
    </div>
  ),
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

vi.mock('../../components/recepcion/DatosPersonalesCard', () => ({
  default: () => <div data-testid="datos-personales-card">DatosPersonalesCard</div>,
}))

vi.mock('../../components/recepcion/PlanPagoCard', () => ({
  default: () => <div data-testid="plan-pago-card">PlanPagoCard</div>,
}))

vi.mock('../../components/recepcion/SaludCard', () => ({
  default: () => <div data-testid="salud-card">SaludCard</div>,
}))

vi.mock('../../components/recepcion/SocioResumenSidebar', () => ({
  default: ({ onSubmit }) => (
    <div data-testid="socio-resumen-sidebar">
      <button onClick={onSubmit}>Crear socio sidebar</button>
    </div>
  ),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useSociosList, useSocioMutations } from '../../hooks/queries/useSociosData'

const mockSocios = [
  { id: 1, nombre: 'Ana', apellido: 'García', estado: 'activo', dni: '11111111' },
  { id: 2, nombre: 'Luis', apellido: 'Herrera', estado: 'activo', dni: '22222222' },
]

const defaultMutations = {
  create: { mutateAsync: vi.fn().mockResolvedValue({}), isLoading: false },
  patch: { mutateAsync: vi.fn(), isLoading: false },
  baja: { mutateAsync: vi.fn(), isLoading: false },
  certificado: { mutateAsync: vi.fn(), isLoading: false },
}

function setupMocks(overrides = {}) {
  useSociosList.mockReturnValue({
    data: { count: 2, results: mockSocios },
    isLoading: false,
    ...overrides.list,
  })
  useSocioMutations.mockReturnValue({ ...defaultMutations, ...overrides.mutations })
}

describe('GestionSociosPage', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Page title ─────────────────────────────────────────────────────────
  it('renders page title "Recepción — Socios"', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Recepción — Socios')).toBeInTheDocument()
    })
  })

  // ── 2. Tab navigation renders ─────────────────────────────────────────────
  it('renders "Listado de Socios" and "Alta en Recepción" tabs', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Listado de Socios')).toBeInTheDocument()
      expect(screen.getByText('Alta en Recepción')).toBeInTheDocument()
    })
  })

  // ── 3. Socio list renders in listado tab ──────────────────────────────────
  it('shows socio names in the listado tab', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
      expect(screen.getByText('Luis')).toBeInTheDocument()
    })
  })

  // ── 4. Loading state ──────────────────────────────────────────────────────
  it('shows loading skeleton when list query is loading', async () => {
    setupMocks({ list: { data: undefined, isLoading: true } })

    renderWithProviders(<GestionSociosPage />)

    await waitFor(() => {
      const cells = document.querySelectorAll('td')
      expect(cells.length).toBeGreaterThan(0)
    })
  })

  // ── 5. Empty state when list is empty ─────────────────────────────────────
  it('shows empty state when socios list is empty', async () => {
    setupMocks({ list: { data: { count: 0, results: [] }, isLoading: false } })

    renderWithProviders(<GestionSociosPage />)

    await waitFor(() => {
      expect(screen.getByText(/sin socios/i)).toBeInTheDocument()
    })
  })

  // ── 6. Column headers render ──────────────────────────────────────────────
  it('renders table column headers', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Nombre')).toBeInTheDocument()
      expect(screen.getByText('Estado')).toBeInTheDocument()
    })
  })

  // ── 7. Clicking "Alta en Recepción" tab switches to form ─────────────────
  it('switches to form tab when "Alta en Recepción" is clicked', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Alta en Recepción')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByTestId('datos-personales-card')).toBeInTheDocument()
    })
  })

  // ── 8. Form tab shows all card components ─────────────────────────────────
  it('form tab renders DatosPersonalesCard, PlanPagoCard, SaludCard', async () => {
    renderWithProviders(<GestionSociosPage />)

    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByTestId('datos-personales-card')).toBeInTheDocument()
      expect(screen.getByTestId('plan-pago-card')).toBeInTheDocument()
      expect(screen.getByTestId('salud-card')).toBeInTheDocument()
    })
  })

  // ── 9. Clicking a row opens detail modal ──────────────────────────────────
  it('opens SocioDetailModal when view-detail button is clicked', async () => {
    renderWithProviders(<GestionSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByTitle('Ver detalle del socio')
    fireEvent.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('socio-detail-modal')).toBeInTheDocument()
    })
  })

  // ── 10. "Nuevo Socio" button appears in listado tab ───────────────────────
  it('renders "Nuevo Socio" button in listado tab', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Nuevo Socio')).toBeInTheDocument()
    })
  })

  // ── 11. Search bar present ────────────────────────────────────────────────
  it('renders search bar in listado tab', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar socio/i)).toBeInTheDocument()
    })
  })

  // ── 12. Cancel button in form tab returns to listado ──────────────────────
  it('clicking Cancel in form tab returns to listado tab', async () => {
    renderWithProviders(<GestionSociosPage />)

    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancelar'))

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })
  })
})
