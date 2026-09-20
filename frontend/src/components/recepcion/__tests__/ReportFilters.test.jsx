import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ReportFilters, { INITIAL_FILTERS } from '../ReportFilters'

vi.mock('../../../hooks/queries/usePlanes', () => ({
  usePlanes: () => ({
    data: [
      { id: 1, nombre: 'Pase Libre' },
      { id: 2, nombre: 'Musculación' },
    ],
    isPending: false,
  }),
}))

describe('ReportFilters component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders category options and header', async () => {
    await act(async () => {
      render(<ReportFilters filters={INITIAL_FILTERS} onFilterChange={vi.fn()} />)
    })

    expect(screen.getByText(/filtros del reporte/i)).toBeInTheDocument()
    expect(screen.getByText('Morosidad')).toBeInTheDocument()
    expect(screen.getByText('Facturación / Ingresos')).toBeInTheDocument()
    expect(screen.getByText('Asistencia y Aforo')).toBeInTheDocument()
  })

  it('triggers onFilterChange when category changes', async () => {
    const handleFilterChange = vi.fn()
    await act(async () => {
      render(<ReportFilters filters={INITIAL_FILTERS} onFilterChange={handleFilterChange} />)
    })

    const facturacionBtn = screen.getByRole('button', { name: /facturación \/ ingresos/i })
    fireEvent.click(facturacionBtn)

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ categoria: 'facturacion' })
    )
  })

  it('triggers onFilterChange when estado changes for morosidad', async () => {
    const handleFilterChange = vi.fn()
    await act(async () => {
      render(
        <ReportFilters
          filters={{ ...INITIAL_FILTERS, categoria: 'morosidad' }}
          onFilterChange={handleFilterChange}
        />
      )
    })

    const estadoSelect = screen.getByLabelText(/estado de morosidad/i)
    fireEvent.change(estadoSelect, { target: { value: 'vencida' } })

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'vencida' })
    )
  })

  it('renders month selector when categoria is facturacion', async () => {
    await act(async () => {
      render(
        <ReportFilters
          filters={{ ...INITIAL_FILTERS, categoria: 'facturacion' }}
          onFilterChange={vi.fn()}
        />
      )
    })

    expect(screen.getByLabelText(/mes de facturación/i)).toBeInTheDocument()
  })

  it('renders date inputs when categoria is asistencia', async () => {
    await act(async () => {
      render(
        <ReportFilters
          filters={{ ...INITIAL_FILTERS, categoria: 'asistencia' }}
          onFilterChange={vi.fn()}
        />
      )
    })

    expect(screen.getByLabelText(/fecha desde/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fecha hasta/i)).toBeInTheDocument()
  })

  it('calls onResetFilters when clicking limpiar filtros button', async () => {
    const handleReset = vi.fn()
    await act(async () => {
      render(
        <ReportFilters
          filters={{ ...INITIAL_FILTERS, estado: 'vencida' }}
          onFilterChange={vi.fn()}
          onResetFilters={handleReset}
        />
      )
    })

    const resetBtn = screen.getByRole('button', { name: /limpiar filtros/i })
    expect(resetBtn).not.toBeDisabled()
    fireEvent.click(resetBtn)

    expect(handleReset).toHaveBeenCalledTimes(1)
  })

  it('handles quick date presets like hoy and esteMes', async () => {
    const handleFilterChange = vi.fn()
    await act(async () => {
      render(
        <ReportFilters
          filters={{ ...INITIAL_FILTERS, categoria: 'asistencia' }}
          onFilterChange={handleFilterChange}
        />
      )
    })

    const hoyBtn = screen.getByRole('button', { name: /^hoy$/i })
    fireEvent.click(hoyBtn)

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha_desde: '2026-09-15',
        fecha_hasta: '2026-09-15',
        mes: '2026-09',
      })
    )
  })
})
