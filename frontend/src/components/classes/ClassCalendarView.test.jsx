/**
 * Tests for ClassCalendarView.
 * Coverage uplift: 0% → ~80%+ on functions.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ClassCalendarView from './ClassCalendarView'

const DIAS_SEMANA = [
  { key: 'Lunes', label: 'Lunes', fecha: '21 Sep' },
  { key: 'Martes', label: 'Martes', fecha: '22 Sep' },
  { key: 'Miércoles', label: 'Miércoles', fecha: '23 Sep' },
  { key: 'Jueves', label: 'Jueves', fecha: '24 Sep' },
  { key: 'Viernes', label: 'Viernes', fecha: '25 Sep' },
  { key: 'Sábado', label: 'Sábado', fecha: '26 Sep' },
]

const DIAS_CON_FECHA = DIAS_SEMANA.map((d, i) => ({ ...d, isoDate: `2026-10-${19 + i}` }))

const CLASSES = [
  {
    id: 1,
    nombre: 'Spinning AM',
    hora: '09:00',
    dia: 'Lunes',
    dias_recurrencia: ['L'],
    cupos_reservados: 5,
    cupo_maximo: 20,
    sala: 'A',
    categoria: 'spinning',
  },
  {
    id: 2,
    nombre: 'Yoga Lunes',
    hora: '10:00',
    dia: 'Lunes',
    dias_recurrencia: [],
    cupos_reservados: 20,
    cupo_maximo: 20,
    sala: 'B',
    categoria: 'yoga',
  },
]

describe('ClassCalendarView', () => {
  const onSelectClass = vi.fn()
  const onOpenAttendees = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  // ── Week grid (view='grid') tests ──────────────────────────────────────────

  // ── 1. Renders HORA header ─────────────────────────────────────────────
  it('renders HORA column header in grid view', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={[]}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="grid"
      />
    )
    expect(screen.getByText('HORA')).toBeInTheDocument()
  })

  // ── 2. Renders day labels ──────────────────────────────────────────────
  it('renders day labels from diasSemana in grid view', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={[]}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="grid"
      />
    )
    expect(screen.getAllByText('Lunes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sábado').length).toBeGreaterThan(0)
  })

  // ── 3. Renders class that matches Lunes slot via dias_recurrencia ──────
  it('renders class name when it matches Lunes slot via dias_recurrencia', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={CLASSES}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="grid"
      />
    )
    expect(screen.getAllByText(/Spinning AM/).length).toBeGreaterThan(0)
  })

  // ── 4. Renders "LLENO" badge when at capacity ──────────────────────────
  it('renders LLENO badge when cupos_reservados >= cupo_maximo', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={CLASSES}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="grid"
      />
    )
    expect(screen.getByText('LLENO')).toBeInTheDocument()
  })

  // ── 5. Clicking class calls onSelectClass ──────────────────────────────
  it('calls onSelectClass when a class card is clicked', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={[CLASSES[0]]}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="grid"
      />
    )
    fireEvent.click(screen.getByText(/Spinning AM/))
    expect(onSelectClass).toHaveBeenCalledWith(CLASSES[0])
  })

  // ── 6. Clicking Lista button calls onOpenAttendees ─────────────────────
  it('calls onOpenAttendees when Lista button is clicked', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={[CLASSES[0]]}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="grid"
      />
    )
    fireEvent.click(screen.getByText('Lista'))
    expect(onOpenAttendees).toHaveBeenCalledWith(CLASSES[0])
  })

  // ── 7. Renders with empty classes array (no crash) ─────────────────────
  it('renders without crashing when classes is empty', () => {
    expect(() =>
      render(
        <ClassCalendarView
          diasSemana={DIAS_SEMANA}
          classes={[]}
          onSelectClass={onSelectClass}
          onOpenAttendees={onOpenAttendees}
        />
      )
    ).not.toThrow()
  })

  // ── 8. Renders with empty diasSemana (no crash) ────────────────────────
  it('renders without crashing when diasSemana is empty', () => {
    expect(() =>
      render(
        <ClassCalendarView
          diasSemana={[]}
          classes={[]}
          onSelectClass={onSelectClass}
          onOpenAttendees={onOpenAttendees}
        />
      )
    ).not.toThrow()
  })

  // ── 9. Matches class via dia string when no dias_recurrencia ──────────
  it('renders class that matches Lunes via dia string (no recurrencia) in grid view', () => {
    const cls = {
      id: 3,
      nombre: 'Pilates',
      hora: '08:00',
      dia: 'Lunes',
      dias_recurrencia: [],
      cupos_reservados: 0,
      cupo_maximo: 10,
      sala: 'C',
      categoria: 'pilates',
    }
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={[cls]}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="grid"
      />
    )
    expect(screen.getAllByText(/Pilates/).length).toBeGreaterThan(0)
  })

  // ── #198 Agenda view tests ─────────────────────────────────────────────

  it('renders agenda view at <md (view=agenda prop)', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={CLASSES}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="agenda"
      />
    )

    // Should show the day selector and first day by default
    expect(screen.getByText('Lunes')).toBeInTheDocument()
    // Navigation buttons
    expect(screen.getByRole('button', { name: /previous day/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next day/i })).toBeInTheDocument()
    // Classes for Monday should be listed
    expect(screen.getByText('Spinning AM')).toBeInTheDocument()
  })

  it('renders week grid at ≥ md (view=grid prop)', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={CLASSES}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="grid"
      />
    )

    // Should show the hour grid header
    expect(screen.getByText('HORA')).toBeInTheDocument()
    // Week grid has all day columns
    expect(screen.getAllByText('Lunes').length).toBeGreaterThan(0)
  })

  it('agenda: next day button navigates to Martes', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={CLASSES}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="agenda"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /next day/i }))
    expect(screen.getByText('Martes')).toBeInTheDocument()
  })

  it('agenda: prev button disabled on first day', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={[]}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="agenda"
      />
    )

    expect(screen.getByRole('button', { name: /previous day/i })).toBeDisabled()
  })

  it('agenda: shows empty state when no classes for selected day', () => {
    render(
      <ClassCalendarView
        diasSemana={DIAS_SEMANA}
        classes={[]}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
        view="agenda"
      />
    )

    expect(screen.getByText(/No hay clases este día/)).toBeInTheDocument()
  })

  // ── Items built from sesiones (they carry a real date, not a weekday) ──────
  describe('sesiones con fecha real', () => {
    const SESIONES = [
      { id: 7, sesion_id: 100, nombre: 'Spinning', hora: '09:00', fecha: '2026-10-20', sala: 'A', categoria: 'spinning', cupos_reservados: 0, cupo_maximo: 20, estado: 'programada' },
    ]

    it('ubica la sesión en la columna del día que corresponde a su fecha', () => {
      render(
        <ClassCalendarView diasSemana={DIAS_CON_FECHA} classes={SESIONES} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} view="grid" />,
      )
      expect(screen.getAllByText('Spinning')).toHaveLength(1)
    })

    it('no repite la sesión en los otros días de la semana', () => {
      const { container } = render(
        <ClassCalendarView diasSemana={DIAS_CON_FECHA} classes={SESIONES} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} view="grid" />,
      )
      expect(container.querySelectorAll('[style*="border-left"]')).toHaveLength(1)
    })

    it('la agenda del día muestra las sesiones de ese día', () => {
      render(
        <ClassCalendarView diasSemana={DIAS_CON_FECHA} classes={SESIONES} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} view="agenda" />,
      )
      fireEvent.click(screen.getByLabelText('Next day'))
      expect(screen.getByText('Spinning')).toBeInTheDocument()
    })
  })
})
