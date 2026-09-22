/**
 * Tests for PlanComparativeTable.
 *
 * Satisfies REQ-3.2 (≥ 8 tests).
 * Props-driven component — no network mocks required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlanComparativeTable from './PlanComparativeTable'
import { resetAllStores } from '../../test/test-utils'

const mockPlanes = [
  {
    id: 1,
    nombre: 'Básico',
    precio: 5000,
    es_popular: false,
    matriz_comparativa: {
      pase_libre: '3x/sem',
      reservas_clases: '—',
      entrenador_asignado: false,
      rutina_personalizada: false,
      acceso_multisede: '1 sede',
      invitado_mensual: false,
      congelar_plan: '—',
    },
  },
  {
    id: 2,
    nombre: 'Premium',
    precio: 8000,
    es_popular: true,
    matriz_comparativa: {
      pase_libre: '✔',
      reservas_clases: 'Todas',
      entrenador_asignado: false,
      rutina_personalizada: true,
      acceso_multisede: '1 sede',
      invitado_mensual: false,
      congelar_plan: '1 mes',
    },
  },
  {
    id: 3,
    nombre: 'Gold',
    precio: 12000,
    es_popular: false,
    matriz_comparativa: {
      pase_libre: '✔',
      reservas_clases: 'Todas + prioridad',
      entrenador_asignado: true,
      rutina_personalizada: true,
      acceso_multisede: '2 sedes',
      invitado_mensual: true,
      congelar_plan: '2 meses',
    },
  },
]

describe('PlanComparativeTable', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  // ── 1. Plan names appear in column headers ────────────────────────────────
  it('renders column header with each plan name', () => {
    render(<PlanComparativeTable planes={mockPlanes} />)

    expect(screen.getByText('Básico')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByText('Gold')).toBeInTheDocument()
  })

  // ── 2. CARACTERÍSTICA header rendered ────────────────────────────────────
  it('renders CARACTERÍSTICA column header', () => {
    render(<PlanComparativeTable planes={mockPlanes} />)

    expect(screen.getByText('CARACTERÍSTICA')).toBeInTheDocument()
  })

  // ── 3. Feature row labels are rendered ────────────────────────────────────
  it('renders feature row labels', () => {
    render(<PlanComparativeTable planes={mockPlanes} />)

    expect(screen.getByText('Pase libre al gym')).toBeInTheDocument()
    expect(screen.getByText('Reservas de clases')).toBeInTheDocument()
    expect(screen.getByText('Entrenador asignado')).toBeInTheDocument()
    expect(screen.getByText('Rutina personalizada')).toBeInTheDocument()
  })

  // ── 4. Precio mensual row is rendered ─────────────────────────────────────
  it('renders "Precio mensual" footer row', () => {
    render(<PlanComparativeTable planes={mockPlanes} />)

    expect(screen.getByText('Precio mensual')).toBeInTheDocument()
  })

  // ── 5. Empty planes array — table still renders headers ───────────────────
  it('renders feature rows even when planes is empty', () => {
    render(<PlanComparativeTable planes={[]} />)

    expect(screen.getByText('CARACTERÍSTICA')).toBeInTheDocument()
    expect(screen.getByText('Pase libre al gym')).toBeInTheDocument()
  })

  // ── 6. Premium colored dot appears for popular plan ───────────────────────
  it('renders colored dot markers for plan headers', () => {
    render(<PlanComparativeTable planes={mockPlanes} />)

    // colored dots are rendered as spans
    const dotSpans = document.querySelectorAll('span[style*="background-color"]')
    expect(dotSpans.length).toBeGreaterThan(0)
  })

  // ── 7. Feature value from matrix is shown ─────────────────────────────────
  it('renders text feature values from matriz_comparativa', () => {
    render(<PlanComparativeTable planes={mockPlanes} />)

    // Básico pase_libre = '3x/sem'
    expect(screen.getByText('3x/sem')).toBeInTheDocument()
  })

  // ── 8. Gold plan shows "2 sedes" for acceso_multisede ────────────────────
  it('renders "2 sedes" for Gold plan acceso multisede', () => {
    render(<PlanComparativeTable planes={mockPlanes} />)

    expect(screen.getByText('2 sedes')).toBeInTheDocument()
  })

  // ── 9. Table element is rendered ──────────────────────────────────────────
  it('renders a <table> element', () => {
    render(<PlanComparativeTable planes={mockPlanes} />)

    expect(document.querySelector('table')).toBeInTheDocument()
  })
})
