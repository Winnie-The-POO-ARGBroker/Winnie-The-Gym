/**
 * Tests for SaludCard.
 * Coverage uplift: 0% → ~80%.
 * Mocked: Card, Input, constants/files.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SaludCard from './SaludCard'

vi.mock('../ui/Card', () => ({
  default: ({ children }) => <div data-testid="card">{children}</div>,
}))

vi.mock('../ui/Input', () => ({
  default: ({ label, onChange, placeholder }) => (
    <div>
      <label>{label}</label>
      <input placeholder={placeholder} onChange={onChange} data-testid={`input-${label}`} />
    </div>
  ),
}))

vi.mock('../../constants/files', () => ({
  MAX_CERT_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  CERT_ACCEPT_ATTR: '.pdf,.jpg,.jpeg,.png',
}))

describe('SaludCard', () => {
  const mockOnFileChange = vi.fn()
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 1. Title renders ──────────────────────────────────────────────────────
  it('renders "Ficha de Salud" title', () => {
    render(<SaludCard />)
    expect(screen.getByText('Ficha de Salud')).toBeInTheDocument()
  })

  // ── 2. File input renders ─────────────────────────────────────────────────
  it('renders file input for apto médico', () => {
    render(<SaludCard />)
    const input = document.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
  })

  // ── 3. Current certificate URL shows "Certificado registrado" ────────────
  it('shows "Certificado registrado" when currentCertificateUrl is provided', () => {
    render(<SaludCard currentCertificateUrl="https://cdn/cert.pdf" />)
    expect(screen.getByText('Certificado registrado')).toBeInTheDocument()
  })

  // ── 4. Current certificate shows view link ────────────────────────────────
  it('shows "Ver actual" link when currentCertificateUrl is provided', () => {
    render(<SaludCard currentCertificateUrl="https://cdn/cert.pdf" />)
    const link = screen.getByText('Ver actual')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://cdn/cert.pdf')
  })

  // ── 5. No certificate URL → no "Certificado registrado" shown ────────────
  it('does not show certificate badge when currentCertificateUrl is null', () => {
    render(<SaludCard currentCertificateUrl={null} />)
    expect(screen.queryByText('Certificado registrado')).not.toBeInTheDocument()
  })

  // ── 6. Valid file selection calls onFileChange ────────────────────────────
  it('calls onFileChange when a valid file is selected', () => {
    render(<SaludCard onFileChange={mockOnFileChange} />)
    const input = document.querySelector('input[type="file"]')
    const file = new File(['content'], 'cert.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 1024 * 100 }) // 100 KB
    fireEvent.change(input, { target: { files: [file] } })
    expect(mockOnFileChange).toHaveBeenCalledWith(file)
  })

  // ── 7. Oversized file shows error and calls onFileChange(null) ────────────
  it('shows file error and calls onFileChange(null) for oversized file', () => {
    render(<SaludCard onFileChange={mockOnFileChange} />)
    const input = document.querySelector('input[type="file"]')
    const bigFile = new File(['x'.repeat(6 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [bigFile] } })
    expect(screen.getByText(/supera el límite de 5 MB/i)).toBeInTheDocument()
    expect(mockOnFileChange).toHaveBeenCalledWith(null)
  })

  // ── 8. Selected file displays filename ────────────────────────────────────
  it('displays selected filename after valid selection', () => {
    render(<SaludCard onFileChange={mockOnFileChange} />)
    const input = document.querySelector('input[type="file"]')
    const file = new File(['content'], 'my-cert.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 50 * 1024 })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText(/my-cert\.pdf/)).toBeInTheDocument()
  })

  // ── 9. Remove button calls onFileChange(null) ─────────────────────────────
  it('removes file and calls onFileChange(null) when X button is clicked', () => {
    render(<SaludCard onFileChange={mockOnFileChange} />)
    const input = document.querySelector('input[type="file"]')
    const file = new File(['content'], 'cert.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 50 * 1024 })
    fireEvent.change(input, { target: { files: [file] } })

    // Find and click the X remove button
    const removeBtn = screen.getByRole('button')
    fireEvent.click(removeBtn)

    expect(mockOnFileChange).toHaveBeenLastCalledWith(null)
    expect(screen.queryByText(/cert\.pdf/)).not.toBeInTheDocument()
  })

  // ── 10. onChange prop shows VENCE and OBSERVACIONES fields ────────────────
  it('renders VENCE and OBSERVACIONES inputs when onChange is provided', () => {
    render(<SaludCard onChange={mockOnChange} />)
    expect(screen.getByTestId('input-VENCE')).toBeInTheDocument()
    expect(screen.getByTestId('input-OBSERVACIONES / LESIONES')).toBeInTheDocument()
  })

  // ── 11. No onChange prop hides VENCE and OBSERVACIONES ───────────────────
  it('hides VENCE and OBSERVACIONES inputs when onChange is not provided', () => {
    render(<SaludCard />)
    expect(screen.queryByTestId('input-VENCE')).not.toBeInTheDocument()
  })
})
