/**
 * Tests for QRFullscreenModal.
 * Coverage uplift: 0% → ~85%.
 * Mocked: Button, QRCode.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QRFullscreenModal from './QRFullscreenModal'

vi.mock('../ui/Button', () => ({
  default: ({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('./QRCode', () => ({
  default: ({ value, size }) => (
    <div data-testid="qr-code" data-value={value} data-size={size}>QRCode</div>
  ),
}))

const MEMBER = {
  nombre: 'Juan',
  apellido: 'Pérez',
  socioNumero: 'S-0042',
  dni: '12345678',
}

describe('QRFullscreenModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    member: MEMBER,
    qrToken: 'qr-token-xyz',
    timeLeft: 22,
    isExpired: false,
  }

  // ── 1. Returns null when isOpen is false ──────────────────────────────────
  it('returns null when isOpen is false', () => {
    const { container } = render(<QRFullscreenModal {...defaultProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()
  })

  // ── 2. Renders QR code when open ─────────────────────────────────────────
  it('renders QRCode component when isOpen is true', () => {
    render(<QRFullscreenModal {...defaultProps} />)
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
  })

  // ── 3. Renders member name ────────────────────────────────────────────────
  it('renders member name', () => {
    render(<QRFullscreenModal {...defaultProps} />)
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument()
  })

  // ── 4. Renders socioNumero and DNI ────────────────────────────────────────
  it('renders socioNumero and DNI', () => {
    render(<QRFullscreenModal {...defaultProps} />)
    expect(screen.getByText(/S-0042.*DNI 12345678/)).toBeInTheDocument()
  })

  // ── 5. Renders timeLeft countdown ────────────────────────────────────────
  it('renders timeLeft in the countdown label', () => {
    render(<QRFullscreenModal {...defaultProps} timeLeft={15} />)
    expect(screen.getByText('15s')).toBeInTheDocument()
  })

  // ── 6. Close button calls onClose ─────────────────────────────────────────
  it('calls onClose when "Cerrar" button is clicked', () => {
    const onClose = vi.fn()
    render(<QRFullscreenModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('Cerrar'))
    expect(onClose).toHaveBeenCalled()
  })

  // ── 7. Dialog has role="dialog" ───────────────────────────────────────────
  it('renders a dialog element with role="dialog"', () => {
    render(<QRFullscreenModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // ── 8. "Winnie The Gym" branding renders ──────────────────────────────────
  it('renders "Winnie The Gym" branding text', () => {
    render(<QRFullscreenModal {...defaultProps} />)
    expect(screen.getByText(/Winnie The Gym/i)).toBeInTheDocument()
  })
})
