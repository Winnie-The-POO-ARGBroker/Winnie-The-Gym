import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Reportes from '../Reportes'
import * as reportsService from '../../../services/reportsService'

vi.mock('../../../services/reportsService', () => ({
  exportReport: vi.fn().mockResolvedValue({ success: true, filename: 'reporte.pdf' }),
  getReportPlans: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../hooks/useAuth', () => ({
  default: () => ({
    user: { rol: 'recepcionista', nombre: 'Test User', email: 'test@gym.test' },
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    setAuth: vi.fn(),
    updateRole: vi.fn(),
    clearAuth: vi.fn(),
  }),
}))

describe('Reportes page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders top bar, export buttons, tabs, and filters', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Reportes />
        </MemoryRouter>
      )
    })

    expect(screen.getByRole('heading', { name: /reportes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar excel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar csv/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^resumen$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^morosidad$/i })).toBeInTheDocument()
  })

  it('triggers exportReport when clicking PDF export button', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Reportes />
        </MemoryRouter>
      )
    })

    const pdfBtn = screen.getByRole('button', { name: /exportar pdf/i })
    await act(async () => {
      fireEvent.click(pdfBtn)
    })

    expect(reportsService.exportReport).toHaveBeenCalledWith(
      'morosidad',
      expect.any(Object),
      'pdf'
    )
  })

  it('triggers exportReport when clicking Excel export button', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Reportes />
        </MemoryRouter>
      )
    })

    const excelBtn = screen.getByRole('button', { name: /exportar excel/i })
    await act(async () => {
      fireEvent.click(excelBtn)
    })

    expect(reportsService.exportReport).toHaveBeenCalledWith(
      'morosidad',
      expect.any(Object),
      'xlsx'
    )
  })

  it('switches tabs and updates active category', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Reportes />
        </MemoryRouter>
      )
    })

    const asistenciaTab = screen.getByRole('button', { name: /^asistencia$/i })
    await act(async () => {
      fireEvent.click(asistenciaTab)
    })

    // Now export should use asistencia
    const csvBtn = screen.getByRole('button', { name: /exportar csv/i })
    await act(async () => {
      fireEvent.click(csvBtn)
    })

    expect(reportsService.exportReport).toHaveBeenCalledWith(
      'asistencia',
      expect.any(Object),
      'csv'
    )
  })
})
