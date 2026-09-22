/**
 * Tests for AdminPlanesPage.
 *
 * Satisfies REQ-2.5 (≥ 10 tests).
 * Mocked: usePlanesQuery, usePlanesMutations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import AdminPlanesPage from './AdminPlanesPage'
import { renderWithProviders, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/queries/usePlanesAdmin', () => ({
  usePlanesQuery: vi.fn(),
  usePlanesMutations: vi.fn(),
}))

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('../../components/layout/TopBar', () => ({
  default: ({ title, subtitle, rightContent }) => (
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {rightContent}
    </div>
  ),
}))

vi.mock('../../components/admin/PlanCard', () => ({
  default: ({ plan, onEdit, onDelete }) => (
    <div data-testid={`plan-card-${plan.id}`}>
      <span>{plan.nombre}</span>
      <span>{plan.precio}</span>
      <button onClick={() => onEdit(plan)}>Editar</button>
      <button onClick={() => onDelete(plan)}>Eliminar</button>
    </div>
  ),
}))

vi.mock('../../components/admin/PlanFormModal', () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="plan-form-modal">PlanFormModal</div> : null,
}))

vi.mock('../../components/admin/PlanComparativeTable', () => ({
  default: ({ planes }) => (
    <div data-testid="plan-comparative-table">
      {planes.map((p) => (
        <span key={p.id}>{p.nombre}</span>
      ))}
    </div>
  ),
}))

vi.mock('../../components/admin/PlanDistributionChart', () => ({
  default: () => <div data-testid="plan-distribution-chart">Chart</div>,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { usePlanesQuery, usePlanesMutations } from '../../hooks/queries/usePlanesAdmin'

const mockPlanes = [
  { id: 1, nombre: 'Básico', precio: 5000, activo: true, socios_activos: 10, es_popular: false },
  { id: 2, nombre: 'Premium', precio: 8000, activo: true, socios_activos: 25, es_popular: true },
  { id: 3, nombre: 'Gold', precio: 12000, activo: true, socios_activos: 5, es_popular: false },
]

const defaultMutations = {
  savePlan: { mutate: vi.fn(), isLoading: false },
  deletePlan: { mutate: vi.fn(), isLoading: false },
  toggleActive: { mutate: vi.fn(), isLoading: false },
}

function setupMocks(overrides = {}) {
  usePlanesQuery.mockReturnValue({
    data: mockPlanes,
    isLoading: false,
    ...overrides.query,
  })
  usePlanesMutations.mockReturnValue({ ...defaultMutations, ...overrides.mutations })
}

describe('AdminPlanesPage', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Page renders plan names ────────────────────────────────────────────
  it('renders plan names from query', async () => {
    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getByText('Básico')).toBeInTheDocument()
      expect(screen.getByText('Premium')).toBeInTheDocument()
      expect(screen.getByText('Gold')).toBeInTheDocument()
    })
  })

  // ── 2. Prices are rendered ────────────────────────────────────────────────
  it('renders plan prices from query', async () => {
    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getByText('5000')).toBeInTheDocument()
      expect(screen.getByText('8000')).toBeInTheDocument()
    })
  })

  // ── 3. Plan cards are rendered ────────────────────────────────────────────
  it('renders a PlanCard for each plan', async () => {
    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getByTestId('plan-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('plan-card-2')).toBeInTheDocument()
      expect(screen.getByTestId('plan-card-3')).toBeInTheDocument()
    })
  })

  // ── 4. Empty state when no planes ────────────────────────────────────────
  it('shows empty state when planes list is empty', async () => {
    setupMocks({ query: { data: [], isLoading: false } })

    renderWithProviders(<AdminPlanesPage />)

    await waitFor(() => {
      expect(screen.getByText(/No hay planes disponibles/i)).toBeInTheDocument()
    })
  })

  // ── 5. "Nuevo plan" button renders ───────────────────────────────────────
  it('renders "Nuevo plan" button', async () => {
    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getByText('Nuevo plan')).toBeInTheDocument()
    })
  })

  // ── 6. Clicking "Nuevo plan" opens modal ──────────────────────────────────
  it('opens PlanFormModal when "Nuevo plan" is clicked', async () => {
    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getByText('Nuevo plan')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Nuevo plan'))

    await waitFor(() => {
      expect(screen.getByTestId('plan-form-modal')).toBeInTheDocument()
    })
  })

  // ── 7. Clicking edit on a plan opens modal ────────────────────────────────
  it('opens modal when edit is triggered from PlanCard', async () => {
    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Editar').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByText('Editar')[0])

    await waitFor(() => {
      expect(screen.getByTestId('plan-form-modal')).toBeInTheDocument()
    })
  })

  // ── 8. Delete calls deletePlan mutation ───────────────────────────────────
  it('calls deletePlan mutation when delete is triggered', async () => {
    const deleteFn = vi.fn()
    setupMocks({ mutations: { deletePlan: { mutate: deleteFn, isLoading: false } } })

    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Eliminar').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByText('Eliminar')[0])

    await waitFor(() => {
      expect(deleteFn).toHaveBeenCalledWith(mockPlanes[0])
    })
  })

  // ── 9. Toast error if trying to delete the last plan ─────────────────────
  it('shows toast.error when trying to delete the only plan', async () => {
    const singlePlan = [{ id: 1, nombre: 'Solo Plan', precio: 5000, activo: true, socios_activos: 5, es_popular: false }]
    setupMocks({ query: { data: singlePlan, isLoading: false } })

    const { toast } = await import('sonner')

    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getByText('Eliminar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Eliminar'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('al menos un plan'))
    })
  })

  // ── 10. Switching to comparativa tab shows PlanComparativeTable ──────────
  it('shows PlanComparativeTable when comparativa tab is selected', async () => {
    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getByText('Comparativa')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Comparativa'))

    await waitFor(() => {
      expect(screen.getByTestId('plan-comparative-table')).toBeInTheDocument()
    })
  })

  // ── 11. Comparativa tab also shows empty state when no plans ─────────────
  it('shows empty state in comparativa tab when no plans', async () => {
    setupMocks({ query: { data: [], isLoading: false } })

    renderWithProviders(<AdminPlanesPage />)

    await waitFor(() => {
      expect(screen.getByText('Comparativa')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Comparativa'))

    await waitFor(() => {
      expect(screen.getByText(/No hay planes disponibles/i)).toBeInTheDocument()
    })
  })

  // ── 12. Distribution chart is rendered ───────────────────────────────────
  it('renders PlanDistributionChart in tarjetas tab', async () => {
    renderWithProviders(<AdminPlanesPage />)
    await waitFor(() => {
      expect(screen.getByTestId('plan-distribution-chart')).toBeInTheDocument()
    })
  })
})
