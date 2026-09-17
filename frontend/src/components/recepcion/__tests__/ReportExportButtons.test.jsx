import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ReportExportButtons from '../ReportExportButtons'

describe('ReportExportButtons component', () => {
  it('renders all three export buttons (PDF, Excel, CSV)', () => {
    render(<ReportExportButtons onExport={vi.fn()} />)

    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar excel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar csv/i })).toBeInTheDocument()
  })

  it('triggers onExport with corresponding format on click', () => {
    const handleExport = vi.fn()
    render(<ReportExportButtons onExport={handleExport} />)

    fireEvent.click(screen.getByRole('button', { name: /exportar pdf/i }))
    expect(handleExport).toHaveBeenCalledWith('pdf')

    fireEvent.click(screen.getByRole('button', { name: /exportar excel/i }))
    expect(handleExport).toHaveBeenCalledWith('xlsx')

    fireEvent.click(screen.getByRole('button', { name: /exportar csv/i }))
    expect(handleExport).toHaveBeenCalledWith('csv')
  })

  it('disables all buttons when downloadingFormat is active', () => {
    render(<ReportExportButtons onExport={vi.fn()} downloadingFormat="pdf" />)

    const pdfBtn = screen.getByRole('button', { name: /exportar pdf/i })
    const excelBtn = screen.getByRole('button', { name: /exportar excel/i })
    const csvBtn = screen.getByRole('button', { name: /exportar csv/i })

    expect(pdfBtn).toBeDisabled()
    expect(excelBtn).toBeDisabled()
    expect(csvBtn).toBeDisabled()
  })

  it('disables all buttons when disabled prop is true', () => {
    render(<ReportExportButtons onExport={vi.fn()} disabled={true} />)

    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /exportar excel/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /exportar csv/i })).toBeDisabled()
  })
})
