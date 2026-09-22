/**
 * Tests for ClassCard.
 *
 * Satisfies REQ-3.5 (≥ 8 tests).
 * Props-driven component — render directly with required props.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ClassCard from './ClassCard'
import { resetAllStores } from '../../test/test-utils'

const mockClaseAvailable = {
  id: 1,
  nombre: 'Spinning Pro',
  instructor: 'Sofia L.',
  sala: 'Sala B',
  horaInicio: '08:00',
  horaFin: '09:00',
  duracionMin: 60,
  categoria: 'spinning',
  cuposTotales: 20,
  cuposReservados: 10,
  intensidad: 3,
  isBooked: false,
  fecha: '2026-09-21',
}

const mockClaseFull = {
  ...mockClaseAvailable,
  id: 2,
  cuposTotales: 20,
  cuposReservados: 20,
}

const mockClaseBooked = {
  ...mockClaseAvailable,
  id: 3,
  isBooked: true,
}

describe('ClassCard', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  // ── 1. Catalog variant renders class name ─────────────────────────────────
  it('renders class name in catalog variant', () => {
    render(<ClassCard clase={mockClaseAvailable} variant="catalog" onBook={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Spinning Pro')).toBeInTheDocument()
  })

  // ── 2. Instructor is visible ──────────────────────────────────────────────
  it('renders instructor name', () => {
    render(<ClassCard clase={mockClaseAvailable} variant="catalog" onBook={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Sofia L.')).toBeInTheDocument()
  })

  // ── 3. Enroll button visible when spots available ─────────────────────────
  it('renders enroll button when class has available spots', () => {
    render(<ClassCard clase={mockClaseAvailable} variant="catalog" onBook={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Reservar mi cupo')).toBeInTheDocument()
  })

  // ── 4. Enroll button disabled when class is full ──────────────────────────
  it('renders disabled enroll button when class is full', () => {
    render(<ClassCard clase={mockClaseFull} variant="catalog" onBook={vi.fn()} onCancel={vi.fn()} />)

    const enrollBtn = screen.getByText('Sin cupos disponibles')
    expect(enrollBtn).toBeInTheDocument()
    expect(enrollBtn.closest('button')).toBeDisabled()
  })

  // ── 5. "Cupo Completo" label shown when full ──────────────────────────────
  it('shows "Cupo Completo" text when class is full', () => {
    render(<ClassCard clase={mockClaseFull} variant="catalog" onBook={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Cupo Completo')).toBeInTheDocument()
  })

  // ── 6. onBook called when enroll button clicked ───────────────────────────
  it('calls onBook with class id when enroll button is clicked', () => {
    const onBook = vi.fn()
    render(<ClassCard clase={mockClaseAvailable} variant="catalog" onBook={onBook} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByText('Reservar mi cupo'))
    expect(onBook).toHaveBeenCalledWith(mockClaseAvailable.id)
  })

  // ── 7. "Reservada" indicator shown when already enrolled ─────────────────
  it('shows "Reservada" indicator when user is already enrolled', () => {
    render(<ClassCard clase={mockClaseBooked} variant="catalog" onBook={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('✓ Reservada')).toBeInTheDocument()
  })

  // ── 8. Cancel button visible when user is enrolled (catalog) ─────────────
  it('shows cancel button when user is enrolled in catalog variant', () => {
    render(<ClassCard clase={mockClaseBooked} variant="catalog" onBook={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  // ── 9. onCancel called when cancel button clicked (catalog enrolled) ──────
  it('calls onCancel with class id when cancel button clicked (catalog enrolled)', () => {
    const onCancel = vi.fn()
    render(<ClassCard clase={mockClaseBooked} variant="catalog" onBook={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Cancelar'))
    expect(onCancel).toHaveBeenCalledWith(mockClaseBooked.id)
  })

  // ── 10. Booked variant renders "Confirmada" badge ─────────────────────────
  it('renders "Confirmada" badge in booked variant', () => {
    render(<ClassCard clase={mockClaseAvailable} variant="booked" onBook={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Confirmada')).toBeInTheDocument()
  })

  // ── 11. Category badge is rendered ───────────────────────────────────────
  it('renders category badge with uppercase text', () => {
    render(<ClassCard clase={mockClaseAvailable} variant="catalog" onBook={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('SPINNING')).toBeInTheDocument()
  })

  // ── 12. Available spots count shown ──────────────────────────────────────
  it('shows available spots count when class is not full', () => {
    render(<ClassCard clase={mockClaseAvailable} variant="catalog" onBook={vi.fn()} onCancel={vi.fn()} />)

    // spotsLeft = 20 - 10 = 10 libres
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})
