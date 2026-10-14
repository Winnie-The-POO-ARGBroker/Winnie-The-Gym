import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PlanComparativeTable from '../PlanComparativeTable'

const PLANES_WITH_MATRIZ = [
  {
    id: 1,
    nombre: 'Básico',
    precio: 10000,
    es_popular: false,
    matriz_comparativa: {
      pase_libre: '3x/sem',
      reservas_clases: '—',
    },
  },
  {
    id: 2,
    nombre: 'Premium',
    precio: 18000,
    es_popular: true,
    matriz_comparativa: {
      pase_libre: '✔',
      reservas_clases: 'Todas',
    },
  },
]

const PLANES_EMPTY_MATRIZ = [
  {
    id: 1,
    nombre: 'Plan A',
    precio: 10000,
    es_popular: false,
    matriz_comparativa: {},
  },
  {
    id: 2,
    nombre: 'Plan B',
    precio: 20000,
    es_popular: false,
    matriz_comparativa: {},
  },
]

const PLANES_NO_MATRIZ = [
  {
    id: 1,
    nombre: 'Plan Sin Matriz',
    precio: 15000,
    es_popular: false,
    // no matriz_comparativa field at all
  },
]

describe('PlanComparativeTable', () => {
  /**
   * Test #12 from contract:
   * "renders empty state when matriz is empty not invented checks"
   */
  it('renders empty state when all plans have empty matriz_comparativa', () => {
    render(<PlanComparativeTable planes={PLANES_EMPTY_MATRIZ} />)
    expect(screen.getByText('Sin datos de comparativa')).toBeInTheDocument()
  })

  it('renders empty state when plans have no matriz_comparativa field', () => {
    render(<PlanComparativeTable planes={PLANES_NO_MATRIZ} />)
    expect(screen.getByText('Sin datos de comparativa')).toBeInTheDocument()
  })

  it('does NOT render hardcoded plan names like Básico/Premium/Gold as fallbacks', () => {
    // With empty matrices, there should be no invented values
    const { container } = render(<PlanComparativeTable planes={PLANES_EMPTY_MATRIZ} />)
    // Only the price row footer exists — no body rows with Check icons
    const bodyRows = container.querySelectorAll('tbody tr')
    // 2 rows: 1 for "Sin datos de comparativa" + 1 for "Precio mensual"
    expect(bodyRows.length).toBe(2)
  })

  it('renders rows from matriz_comparativa keys — no invented fallbacks', () => {
    render(<PlanComparativeTable planes={PLANES_WITH_MATRIZ} />)

    // Row labels should come from the actual keys (humanized)
    expect(screen.getByText('Pase Libre')).toBeInTheDocument()
    expect(screen.getByText('Reservas Clases')).toBeInTheDocument()

    // Values should be from actual data
    expect(screen.getByText('3x/sem')).toBeInTheDocument()
    expect(screen.getByText('Todas')).toBeInTheDocument()

    // No hardcoded names invented
    expect(screen.queryByText('Gold')).not.toBeInTheDocument()
  })

  it('renders plan names in header columns', () => {
    render(<PlanComparativeTable planes={PLANES_WITH_MATRIZ} />)
    expect(screen.getByText('Básico')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
  })

  it('renders precio mensual footer for each plan', () => {
    render(<PlanComparativeTable planes={PLANES_WITH_MATRIZ} />)
    expect(screen.getByText('Precio mensual')).toBeInTheDocument()
    // Both prices should appear
    expect(screen.getByText(/10\.000|10,000/)).toBeInTheDocument()
    expect(screen.getByText(/18\.000|18,000/)).toBeInTheDocument()
  })

  it('renders empty table when planes is an empty array', () => {
    render(<PlanComparativeTable planes={[]} />)
    expect(screen.getByText('CARACTERÍSTICA')).toBeInTheDocument()
    // With no planes there are no keys → empty state message IS shown
    expect(screen.getByText('Sin datos de comparativa')).toBeInTheDocument()
  })

  it('builds rows from union of all plan keys', () => {
    const planes = [
      { id: 1, nombre: 'A', precio: 100, es_popular: false, matriz_comparativa: { acceso: '✔' } },
      { id: 2, nombre: 'B', precio: 200, es_popular: false, matriz_comparativa: { acceso: '—', vestuario: '✔' } },
    ]
    render(<PlanComparativeTable planes={planes} />)
    // Both keys should appear
    expect(screen.getByText('Acceso')).toBeInTheDocument()
    expect(screen.getByText('Vestuario')).toBeInTheDocument()
  })
})
