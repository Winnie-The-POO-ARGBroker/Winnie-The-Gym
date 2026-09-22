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

  // ── 1. Renders HORA header ─────────────────────────────────────────────
  it('renders HORA column header', () => {
    render(<ClassCalendarView diasSemana={DIAS_SEMANA} classes={[]} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} />)
    expect(screen.getByText('HORA')).toBeInTheDocument()
  })

  // ── 2. Renders day labels ──────────────────────────────────────────────
  it('renders day labels from diasSemana', () => {
    render(<ClassCalendarView diasSemana={DIAS_SEMANA} classes={[]} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} />)
    expect(screen.getAllByText('Lunes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sábado').length).toBeGreaterThan(0)
  })

  // ── 3. Renders class that matches Lunes slot via dias_recurrencia ──────
  it('renders class name when it matches Lunes slot via dias_recurrencia', () => {
    render(<ClassCalendarView diasSemana={DIAS_SEMANA} classes={CLASSES} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} />)
    expect(screen.getAllByText(/Spinning AM/).length).toBeGreaterThan(0)
  })

  // ── 4. Renders "LLENO" badge when at capacity ──────────────────────────
  it('renders LLENO badge when cupos_reservados >= cupo_maximo', () => {
    render(<ClassCalendarView diasSemana={DIAS_SEMANA} classes={CLASSES} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} />)
    expect(screen.getByText('LLENO')).toBeInTheDocument()
  })

  // ── 5. Clicking class calls onSelectClass ──────────────────────────────
  it('calls onSelectClass when a class card is clicked', () => {
    render(<ClassCalendarView diasSemana={DIAS_SEMANA} classes={[CLASSES[0]]} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} />)
    fireEvent.click(screen.getByText(/Spinning AM/))
    expect(onSelectClass).toHaveBeenCalledWith(CLASSES[0])
  })

  // ── 6. Clicking Lista button calls onOpenAttendees ─────────────────────
  it('calls onOpenAttendees when Lista button is clicked', () => {
    render(<ClassCalendarView diasSemana={DIAS_SEMANA} classes={[CLASSES[0]]} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} />)
    fireEvent.click(screen.getByText('Lista'))
    expect(onOpenAttendees).toHaveBeenCalledWith(CLASSES[0])
  })

  // ── 7. Renders with empty classes array (no crash) ─────────────────────
  it('renders without crashing when classes is empty', () => {
    expect(() =>
      render(<ClassCalendarView diasSemana={DIAS_SEMANA} classes={[]} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} />)
    ).not.toThrow()
  })

  // ── 8. Renders with empty diasSemana (no crash) ────────────────────────
  it('renders without crashing when diasSemana is empty', () => {
    expect(() =>
      render(<ClassCalendarView diasSemana={[]} classes={[]} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} />)
    ).not.toThrow()
  })

  // ── 9. Matches class via dia string when no dias_recurrencia ──────────
  it('renders class that matches Lunes via dia string (no recurrencia)', () => {
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
    render(<ClassCalendarView diasSemana={DIAS_SEMANA} classes={[cls]} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} />)
    expect(screen.getAllByText(/Pilates/).length).toBeGreaterThan(0)
  })
})
