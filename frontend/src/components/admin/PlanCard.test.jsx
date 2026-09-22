/**
 * Tests for PlanCard.
 * Coverage uplift: 0% → ~85%.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlanCard from './PlanCard'

const PLAN_MOCK = {
  id: 1,
  nombre: 'Premium',
  precio: 9000,
  subtitulo: 'Membresía completa',
  es_popular: false,
  socios_activos: 42,
  beneficios: [
    { texto: 'Acceso ilimitado', incluido: true },
    { texto: 'Clases grupales', incluido: true },
    { texto: 'Personal trainer', incluido: false },
  ],
}

describe('PlanCard', () => {
  const onEdit = vi.fn()
  const onArchive = vi.fn()
  const onDelete = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  // ── 1. Renders plan name ──────────────────────────────────────────────────
  it('renders plan nombre', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} />)
    expect(screen.getByText('Premium')).toBeInTheDocument()
  })

  // ── 2. Renders price ──────────────────────────────────────────────────────
  it('renders formatted price', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} />)
    // Formatted ARS price should appear
    expect(screen.getByText(/9\.000|9,000|\$ 9/)).toBeInTheDocument()
  })

  // ── 3. Renders socios_activos count ───────────────────────────────────────
  it('renders socios_activos count', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} />)
    expect(screen.getByText(/42 socios/)).toBeInTheDocument()
  })

  // ── 4. Renders benefits ───────────────────────────────────────────────────
  it('renders benefits list', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} />)
    expect(screen.getByText('Acceso ilimitado')).toBeInTheDocument()
    expect(screen.getByText('Personal trainer')).toBeInTheDocument()
  })

  // ── 5. Renders POPULAR badge when es_popular is true ─────────────────────
  it('renders POPULAR badge for popular plans', () => {
    const popularPlan = { ...PLAN_MOCK, es_popular: true }
    render(<PlanCard plan={popularPlan} onEdit={onEdit} onArchive={onArchive} />)
    expect(screen.getByText('POPULAR')).toBeInTheDocument()
  })

  // ── 6. Does not render POPULAR badge for non-popular plans ───────────────
  it('does not render POPULAR badge for non-popular plans', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} />)
    expect(screen.queryByText('POPULAR')).not.toBeInTheDocument()
  })

  // ── 7. Edit button calls onEdit with plan ────────────────────────────────
  it('calls onEdit with plan when Editar is clicked', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} />)
    fireEvent.click(screen.getByText('Editar'))
    expect(onEdit).toHaveBeenCalledWith(PLAN_MOCK)
  })

  // ── 8. Archive button calls onArchive with plan ──────────────────────────
  it('calls onArchive with plan when Archivar is clicked', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} />)
    fireEvent.click(screen.getByText('Archivar'))
    expect(onArchive).toHaveBeenCalledWith(PLAN_MOCK)
  })

  // ── 9. Delete button renders and calls onDelete when provided ────────────
  it('shows delete button and calls onDelete when provided', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} />)
    const deleteBtn = screen.getByTitle('Eliminar plan')
    expect(deleteBtn).toBeInTheDocument()
    fireEvent.click(deleteBtn)
    expect(onDelete).toHaveBeenCalledWith(PLAN_MOCK)
  })

  // ── 10. Delete button hidden when onDelete not provided ──────────────────
  it('does not show delete button when onDelete is not provided', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} />)
    expect(screen.queryByTitle('Eliminar plan')).not.toBeInTheDocument()
  })

  // ── 11. Subtitulo renders ─────────────────────────────────────────────────
  it('renders plan subtitulo', () => {
    render(<PlanCard plan={PLAN_MOCK} onEdit={onEdit} onArchive={onArchive} />)
    expect(screen.getByText('Membresía completa')).toBeInTheDocument()
  })

  // ── 12. Default subtitulo when none provided ─────────────────────────────
  it('shows default "Membresía estándar" when subtitulo is null', () => {
    render(<PlanCard plan={{ ...PLAN_MOCK, subtitulo: null }} onEdit={onEdit} onArchive={onArchive} />)
    expect(screen.getByText('Membresía estándar')).toBeInTheDocument()
  })
})
