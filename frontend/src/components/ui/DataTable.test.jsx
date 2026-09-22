/**
 * Tests for DataTable component.
 *
 * Satisfies REQ-4.4 (≥ 8 tests).
 * Props-driven component — no network mocks required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DataTable from './DataTable'
import { resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./EmptyState', () => ({
  default: ({ title, message }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{message}</p>
    </div>
  ),
}))

// ── Test data ─────────────────────────────────────────────────────────────────

const columns = [
  { key: 'nombre', label: 'Nombre', sortable: true },
  { key: 'apellido', label: 'Apellido', sortable: false },
  { key: 'estado', label: 'Estado', sortable: true },
]

const data = [
  { id: 1, nombre: 'Ana', apellido: 'García', estado: 'activo' },
  { id: 2, nombre: 'Carlos', apellido: 'López', estado: 'baja' },
  { id: 3, nombre: 'Beatriz', apellido: 'Martínez', estado: 'activo' },
]

describe('DataTable', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  // ── 1. Column headers rendered ────────────────────────────────────────────
  it('renders all column headers', () => {
    render(<DataTable columns={columns} data={data} />)

    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Apellido')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
  })

  // ── 2. Row cell values match data ─────────────────────────────────────────
  it('renders each row with correct cell values', () => {
    render(<DataTable columns={columns} data={data} />)

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('García')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('baja')).toBeInTheDocument()
    expect(screen.getByText('Beatriz')).toBeInTheDocument()
  })

  // ── 3. Empty state when data is empty array ───────────────────────────────
  it('shows EmptyState when data is an empty array', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="Sin resultados"
        emptyMessage="No hay registros"
      />,
    )

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })

  // ── 4. Empty state when data is null/undefined ────────────────────────────
  it('shows EmptyState when data is undefined', () => {
    render(<DataTable columns={columns} data={undefined} />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  // ── 5. onSort called when sortable header clicked ─────────────────────────
  it('calls onSort with column key when sortable header is clicked', () => {
    const onSort = vi.fn()
    render(<DataTable columns={columns} data={data} onSort={onSort} />)

    // Click "Nombre" header (sortable: true)
    const nombreHeader = screen.getByRole('button', { name: /nombre/i })
    fireEvent.click(nombreHeader)

    expect(onSort).toHaveBeenCalledWith('nombre')
  })

  // ── 6. Non-sortable header is not a button ────────────────────────────────
  it('does not render non-sortable headers as buttons', () => {
    render(<DataTable columns={columns} data={data} onSort={vi.fn()} />)

    // "Apellido" is not sortable
    const headers = screen.getAllByRole('button')
    const apellidoHeader = headers.find((el) => el.textContent.includes('Apellido'))
    expect(apellidoHeader).toBeUndefined()
  })

  // ── 7. Sort asc -> desc toggle on second click ────────────────────────────
  it('calls onSort with "-nombre" on second click (asc -> desc)', () => {
    const onSort = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        onSort={onSort}
        ordering="nombre"
      />,
    )

    // ordering="nombre" means asc, so clicking again sends "-nombre"
    const nombreHeader = screen.getByRole('button', { name: /nombre/i })
    fireEvent.click(nombreHeader)

    expect(onSort).toHaveBeenCalledWith('-nombre')
  })

  // ── 8. Loading state renders skeleton rows ────────────────────────────────
  it('renders skeleton rows when loading is true', () => {
    render(<DataTable columns={columns} data={data} loading={true} />)

    // In loading state, skeleton cells appear
    const skeletons = document.querySelectorAll('.rounded')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  // ── 9. onRowClick called when row is clicked ──────────────────────────────
  it('calls onRowClick with row data when a row is clicked', () => {
    const onRowClick = vi.fn()
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />)

    // Click first data row (by clicking on a cell text)
    fireEvent.click(screen.getByText('Ana').closest('tr'))

    expect(onRowClick).toHaveBeenCalledWith(data[0])
  })

  // ── 10. renderActions column header rendered ──────────────────────────────
  it('renders "Acciones" column header when renderActions is provided', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        renderActions={(row) => <button>Ver {row.nombre}</button>}
      />,
    )

    expect(screen.getByText('Acciones')).toBeInTheDocument()
  })

  // ── 11. renderActions is called for each row ──────────────────────────────
  it('renders action buttons for each data row via renderActions', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        renderActions={(row) => <button>Ver {row.nombre}</button>}
      />,
    )

    expect(screen.getByText('Ver Ana')).toBeInTheDocument()
    expect(screen.getByText('Ver Carlos')).toBeInTheDocument()
    expect(screen.getByText('Ver Beatriz')).toBeInTheDocument()
  })
})
