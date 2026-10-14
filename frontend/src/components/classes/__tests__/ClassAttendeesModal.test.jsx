/**
 * Tests for ClassAttendeesModal — tri-state attendance counter (fix #171).
 *
 * Covers:
 *  - Presentes / Ausentes / Sin marcar counter with backend tri-state (null/true/false)
 *  - Toggle buttons render correctly per state
 *  - Search filters by socio_nombre and socio_dni
 *  - plan_nombre displayed from backend field
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ClassAttendeesModal from '../ClassAttendeesModal'

// Mock useClasesMutations so ClassAttendeesModal doesn't need a QueryClientProvider
vi.mock('../../../hooks/queries/useClases', () => ({
  useClasesMutations: vi.fn(() => ({
    promoverEspera: { mutate: vi.fn(), isPending: false },
    create: { mutate: vi.fn() },
    update: { mutate: vi.fn() },
    remove: { mutate: vi.fn() },
    cancelar: { mutate: vi.fn() },
  })),
  useClasesList: vi.fn(() => ({ data: [], isFetching: false })),
  useClaseDetail: vi.fn(() => ({ data: undefined })),
}))

vi.mock('../../ui/Avatar', () => ({
  default: ({ name }) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('../../ui/Button', () => ({
  default: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('../../ui/Modal', () => ({
  default: ({ isOpen, children, title, description }) =>
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-description">{description}</div>
        {children}
      </div>
    ) : null,
}))

const SELECTED_CLASS = {
  id: 10,
  nombre: 'Spinning Avanzado',
  dia: 'Lunes',
  hora: '08:00',
  duracion_min: 45,
  sala: 'Sala A',
  instructor: 'Prof. García',
  cupo_maximo: 20,
}

const ATTENDEES = [
  {
    id: 1,
    socio_nombre: 'Juan',
    socio_apellido: 'Pérez',
    socio_dni: '30111222',
    plan_nombre: 'Plan Premium',
    asistio: true,   // presente
    created_at: '2026-10-14T08:05:00Z',
  },
  {
    id: 2,
    socio_nombre: 'María',
    socio_apellido: 'García',
    socio_dni: '28333444',
    plan_nombre: 'Plan Básico',
    asistio: false,  // ausente
    created_at: '2026-10-14T08:06:00Z',
  },
  {
    id: 3,
    socio_nombre: 'Pedro',
    socio_apellido: 'López',
    socio_dni: '35555666',
    plan_nombre: 'Plan Básico',
    asistio: null,   // sin marcar
    created_at: '2026-10-14T08:07:00Z',
  },
  {
    id: 4,
    socio_nombre: 'Ana',
    socio_apellido: 'Rodríguez',
    socio_dni: '32777888',
    plan_nombre: 'Plan Gold',
    asistio: null,   // sin marcar
    created_at: '2026-10-14T08:08:00Z',
  },
]

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <ClassAttendeesModal
        isOpen={true}
        onClose={vi.fn()}
        selectedClass={SELECTED_CLASS}
        attendees={ATTENDEES}
        onToggleStatus={vi.fn()}
        onSave={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  )
}

describe('ClassAttendeesModal > renders tri-state with correct counter', () => {
  // ── 1. Counter: 1 presente ────────────────────────────────────────────────
  it('shows correct presentes count from asistio===true', () => {
    renderModal()
    expect(screen.getByText(/1 presentes/i)).toBeInTheDocument()
  })

  // ── 2. Counter: 1 ausente ─────────────────────────────────────────────────
  it('shows correct ausentes count from asistio===false', () => {
    renderModal()
    expect(screen.getByText(/1 ausentes/i)).toBeInTheDocument()
  })

  // ── 3. Counter: 2 sin marcar (null) ───────────────────────────────────────
  it('shows correct sin marcar count from asistio===null', () => {
    renderModal()
    expect(screen.getByText(/2 sin marcar/i)).toBeInTheDocument()
  })

  // ── 4. All attendees render by name ──────────────────────────────────────
  it('renders all attendee full names', () => {
    renderModal()
    // Each name appears in both the h4 and the Avatar mock, so use getAllByText
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0)
    expect(screen.getAllByText('María García').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pedro López').length).toBeGreaterThan(0)
  })

  // ── 5. plan_nombre from backend field ─────────────────────────────────────
  it('renders plan_nombre from backend field', () => {
    renderModal()
    const premiums = screen.getAllByText('Plan Premium')
    expect(premiums.length).toBeGreaterThan(0)
  })

  // ── 6. socio_dni displayed ────────────────────────────────────────────────
  it('displays socio_dni for each attendee', () => {
    renderModal()
    expect(screen.getByText(/30111222/)).toBeInTheDocument()
  })

  // ── 7. onToggleStatus called on Presente button click ────────────────────
  it('calls onToggleStatus with (id, "presente") when Presente clicked', () => {
    const onToggleStatus = vi.fn()
    renderModal({ onToggleStatus })
    const presenteButtons = screen.getAllByText('Presente')
    fireEvent.click(presenteButtons[0])
    expect(onToggleStatus).toHaveBeenCalledWith(ATTENDEES[0].id, 'presente')
  })

  // ── 8. onToggleStatus called on Ausente button click ─────────────────────
  it('calls onToggleStatus with (id, "ausente") when Ausente clicked', () => {
    const onToggleStatus = vi.fn()
    renderModal({ onToggleStatus })
    const ausenteButtons = screen.getAllByText('Ausente')
    fireEvent.click(ausenteButtons[0])
    expect(onToggleStatus).toHaveBeenCalledWith(ATTENDEES[0].id, 'ausente')
  })

  // ── 9. Search filters by socio_nombre ────────────────────────────────────
  it('filters attendees by socio_nombre when searching', () => {
    renderModal()
    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i)
    fireEvent.change(searchInput, { target: { value: 'juan' } })
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0)
    // María should not appear (not in filtered list) — check h4 specifically
    const headings = screen.queryAllByRole('heading', { level: 4 })
    expect(headings.every(h => !h.textContent.includes('María'))).toBe(true)
  })

  // ── 10. Search filters by socio_dni ──────────────────────────────────────
  it('filters attendees by socio_dni when searching', () => {
    renderModal()
    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i)
    fireEvent.change(searchInput, { target: { value: '28333444' } })
    expect(screen.getAllByText('María García').length).toBeGreaterThan(0)
    // Juan should not appear — check h4 specifically
    const headings = screen.queryAllByRole('heading', { level: 4 })
    expect(headings.every(h => !h.textContent.includes('Juan'))).toBe(true)
  })

  // ── 11. Empty attendees shows fallback message ────────────────────────────
  it('shows empty message when no attendees match search', () => {
    renderModal()
    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i)
    fireEvent.change(searchInput, { target: { value: 'zzz_not_found' } })
    expect(screen.getByText(/no se encontraron socios/i)).toBeInTheDocument()
  })

  // ── 12. Modal does not render when isOpen=false ───────────────────────────
  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })
})
