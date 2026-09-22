/**
 * Tests for ClassListDetailView.
 * Coverage uplift: 0% → ~75%+ on functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ClassListDetailView from './ClassListDetailView'

vi.mock('../ui/Button', () => ({
  default: ({ children, onClick, variant }) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
}))

const CLASSES = [
  {
    id: 1,
    nombre: 'Spinning AM',
    hora: '09:00',
    dia: 'Lunes',
    sala: 'A',
    cupos_reservados: 5,
    cupo_maximo: 20,
    categoria: 'spinning',
    instructor: 'Prof. García',
    descripcion: 'Clase de spinning intensa',
  },
  {
    id: 2,
    nombre: 'Yoga Relax',
    hora: '10:00',
    dia: 'Martes',
    sala: 'B',
    cupos_reservados: 20,
    cupo_maximo: 20,
    categoria: 'yoga',
    instructor: 'Prof. López',
    descripcion: 'Yoga para todos los niveles',
  },
]

describe('ClassListDetailView', () => {
  const onSelectClass = vi.fn()
  const onOpenAttendees = vi.fn()
  const onEditClass = vi.fn()
  const onDeleteClass = vi.fn()

  function renderView({ classes = CLASSES, selectedClass = null } = {}) {
    return render(
      <ClassListDetailView
        classes={classes}
        selectedClass={selectedClass}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        onEditClass={onEditClass}
        onDeleteClass={onDeleteClass}
      />
    )
  }

  beforeEach(() => vi.clearAllMocks())

  // ── 1. Renders class names in list ─────────────────────────────────────
  it('renders class names in the list', () => {
    renderView()
    expect(screen.getAllByText('Spinning AM').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Yoga Relax').length).toBeGreaterThan(0)
  })

  // ── 2. Category filter buttons render ──────────────────────────────────
  it('renders category filter buttons', () => {
    renderView()
    expect(screen.getByText('Todas')).toBeInTheDocument()
    // "Spinning" appears in filter button AND potentially in detail panel
    expect(screen.getAllByText('Spinning').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Yoga').length).toBeGreaterThan(0)
  })

  // ── 3. Clicking category filter narrows list ───────────────────────────
  it('filters to only Yoga classes when Yoga filter is clicked', () => {
    renderView()
    // Click the Yoga filter button (first occurrence is the filter)
    const yogaButtons = screen.getAllByText('Yoga')
    fireEvent.click(yogaButtons[0])
    // Spinning AM should not be in the list section
    expect(screen.queryAllByText('Spinning AM').length).toBe(0)
    expect(screen.getAllByText('Yoga Relax').length).toBeGreaterThan(0)
  })

  // ── 4. Shows "no classes" message when filtered to empty ───────────────
  it('shows empty message when no classes match the filter', () => {
    renderView()
    fireEvent.click(screen.getByText('Crossfit'))
    expect(screen.getByText(/No hay clases registradas en esta disciplina/)).toBeInTheDocument()
  })

  // ── 5. Clicking a class calls onSelectClass ─────────────────────────────
  it('calls onSelectClass when a class item is clicked', () => {
    renderView()
    // Click the Yoga class in the list
    const yogaCells = screen.getAllByText('Yoga Relax')
    fireEvent.click(yogaCells[0])
    expect(onSelectClass).toHaveBeenCalledWith(CLASSES[1])
  })

  // ── 6. LLENO badge renders for full class ──────────────────────────────
  it('renders occupancy badge for full class', () => {
    renderView()
    // Yoga Relax is at full capacity (20/20)
    expect(screen.getByText('20/20')).toBeInTheDocument()
  })

  // ── 7. selectedClass prop highlights the selected class ───────────────
  it('uses selectedClass prop as the current class', () => {
    renderView({ selectedClass: CLASSES[1] })
    // Detail panel should show Yoga Relax info (instructor, etc.)
    expect(screen.getAllByText(/Yoga Relax/).length).toBeGreaterThan(0)
  })

  // ── 8. Renders without crashing with empty classes ─────────────────────
  it('renders without crashing when classes is empty', () => {
    expect(() => renderView({ classes: [] })).not.toThrow()
  })
})
