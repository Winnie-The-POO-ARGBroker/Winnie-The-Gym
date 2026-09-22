/**
 * Tests for CheckoutPage.
 *
 * Coverage uplift: 0% → ~80%.
 * Mocked: usePlanesQuery, useCrearPreferenciaMutation, MemberLayout, Card, EmptyState, Button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CheckoutPage from './CheckoutPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/queries/usePlanesAdmin', () => ({
  usePlanesQuery: vi.fn(),
}))

vi.mock('../../hooks/queries/usePagos', () => ({
  useCrearPreferenciaMutation: vi.fn(),
}))

vi.mock('../../components/layout/MemberLayout', () => ({
  default: ({ children, title, subtitle }) => (
    <div data-testid="member-layout">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
}))

vi.mock('../../components/ui/Card', () => ({
  default: ({ children, className }) => (
    <div data-testid="plan-card" className={className}>
      {children}
    </div>
  ),
}))

vi.mock('../../components/ui/EmptyState', () => ({
  default: ({ title, message }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{message}</p>
    </div>
  ),
}))

vi.mock('../../components/ui/Button', () => ({
  default: ({ children, onClick, loading, id }) => (
    <button id={id} onClick={onClick} disabled={loading} data-loading={loading}>
      {children}
    </button>
  ),
}))

import { usePlanesQuery } from '../../hooks/queries/usePlanesAdmin'
import { useCrearPreferenciaMutation } from '../../hooks/queries/usePagos'

const mockMutate = vi.fn()

const PLANES_MOCK = [
  {
    id: 1,
    nombre: 'Básico',
    precio: '5000',
    duracion_dias: 30,
    activo: true,
    es_popular: false,
    descripcion: 'Acceso básico\nClases grupales',
  },
  {
    id: 2,
    nombre: 'Premium',
    precio: '9000',
    duracion_dias: 30,
    activo: true,
    es_popular: true,
    descripcion: 'Todo incluido',
  },
  {
    id: 3,
    nombre: 'Inactivo',
    precio: '3000',
    duracion_dias: 30,
    activo: false,
    es_popular: false,
    descripcion: null,
  },
]

function setupMocks({ planes = PLANES_MOCK, isLoading = false } = {}) {
  usePlanesQuery.mockReturnValue({ data: planes, isLoading })
  useCrearPreferenciaMutation.mockReturnValue({ mutate: mockMutate, isPending: false })
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Layout renders ─────────────────────────────────────────────────────
  it('renders MemberLayout with "Renovar membresía" title', () => {
    render(<CheckoutPage />)
    expect(screen.getByText('Renovar membresía')).toBeInTheDocument()
  })

  // ── 2. Security message renders ───────────────────────────────────────────
  it('renders MercadoPago security message', () => {
    render(<CheckoutPage />)
    expect(screen.getByText(/Pagos procesados de forma segura/i)).toBeInTheDocument()
  })

  // ── 3. Active plans render ────────────────────────────────────────────────
  it('renders only active plans (filters out inactive)', () => {
    render(<CheckoutPage />)
    expect(screen.getByText('Básico')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument()
  })

  // ── 4. Plan prices render ─────────────────────────────────────────────────
  it('renders plan prices in ARS format', () => {
    render(<CheckoutPage />)
    expect(screen.getByText(/5\.000|5,000|5000/)).toBeInTheDocument()
  })

  // ── 5. Pagar button renders per plan ─────────────────────────────────────
  it('renders "Pagar con MercadoPago" button for each active plan', () => {
    render(<CheckoutPage />)
    const buttons = screen.getAllByText(/Pagar con MercadoPago/i)
    // 2 active plans
    expect(buttons).toHaveLength(2)
  })

  // ── 6. Popular badge renders ──────────────────────────────────────────────
  it('renders "Más popular" badge for es_popular plan', () => {
    render(<CheckoutPage />)
    expect(screen.getByText('Más popular')).toBeInTheDocument()
  })

  // ── 7. Benefits list renders from descripcion ─────────────────────────────
  it('renders benefit items from plan.descripcion split by newline', () => {
    render(<CheckoutPage />)
    expect(screen.getByText('Acceso básico')).toBeInTheDocument()
    expect(screen.getByText('Clases grupales')).toBeInTheDocument()
  })

  // ── 8. Plan with null descripcion renders without crash ───────────────────
  it('renders plan with null descripcion without crashing (no benefits shown)', () => {
    setupMocks({
      planes: [{ id: 4, nombre: 'Sin desc', precio: '1000', duracion_dias: 30, activo: true, es_popular: false, descripcion: null }],
    })
    expect(() => render(<CheckoutPage />)).not.toThrow()
    expect(screen.getByText('Sin desc')).toBeInTheDocument()
  })

  // ── 9. Empty state when no active plans ──────────────────────────────────
  it('shows EmptyState when there are no active planes', () => {
    setupMocks({ planes: [] })
    render(<CheckoutPage />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('Sin planes disponibles')).toBeInTheDocument()
  })

  // ── 10. Loading state shows skeletons ────────────────────────────────────
  it('shows skeleton UI when isLoading is true', () => {
    setupMocks({ isLoading: true })
    render(<CheckoutPage />)
    // Skeletons are shown; plan names should not be in DOM
    expect(screen.queryByText('Básico')).not.toBeInTheDocument()
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  // ── 11. Pagar button calls mutate ─────────────────────────────────────────
  it('calls crearPreferencia.mutate with plan.id when Pagar button is clicked', () => {
    render(<CheckoutPage />)
    const buttons = screen.getAllByText(/Pagar con MercadoPago/i)
    fireEvent.click(buttons[0])
    expect(mockMutate).toHaveBeenCalledWith(1, expect.any(Object))
  })

  // ── 12. Duration label renders ────────────────────────────────────────────
  it('renders duration label "30 días" for each plan', () => {
    render(<CheckoutPage />)
    const labels = screen.getAllByText(/30 días/i)
    expect(labels.length).toBeGreaterThan(0)
  })

  // ── 13. Inactivo plan is excluded even if it is popular ───────────────────
  it('excludes inactive plans even if es_popular is true', () => {
    setupMocks({
      planes: [
        { id: 1, nombre: 'ActivePlan', precio: '5000', duracion_dias: 30, activo: true, es_popular: false, descripcion: null },
        { id: 2, nombre: 'PopularButInactive', precio: '9000', duracion_dias: 30, activo: false, es_popular: true, descripcion: null },
      ],
    })
    render(<CheckoutPage />)
    expect(screen.getByText('ActivePlan')).toBeInTheDocument()
    expect(screen.queryByText('PopularButInactive')).not.toBeInTheDocument()
    expect(screen.queryByText('Más popular')).not.toBeInTheDocument()
  })
})
