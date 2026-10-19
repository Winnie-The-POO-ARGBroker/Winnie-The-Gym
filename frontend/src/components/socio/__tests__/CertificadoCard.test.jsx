/**
 * Tests obligatorios PR6 (contrato #15):
 *   CertificadoCard > renders apto_estado badge with vencimiento date
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import api from '../../../services/api'
import CertificadoCard from '../CertificadoCard'

// Mock the api module to isolate network calls
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

describe('CertificadoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Contract test #15 ─────────────────────────────────────────────────────
  it('renders apto_estado badge with vencimiento date', () => {
    render(
      <CertificadoCard
        socioId={1}
        aptoEstado="por_vencer"
        certificadoEmitidoEn="2024-01-01"
        certificadoVenceEn="2024-12-31"
      />,
    )

    // Badge should display the human-readable label for por_vencer
    expect(screen.getByTestId('apto-estado-badge')).toBeInTheDocument()
    expect(screen.getByTestId('apto-estado-badge')).toHaveTextContent('Por vencer')

    // Vencimiento date should be rendered in the card body
    expect(screen.getByText(/31 de diciembre de 2024/i)).toBeInTheDocument()
  })

  it('renders sin_apto neutral badge when no certificado', () => {
    render(
      <CertificadoCard
        socioId={1}
        aptoEstado="sin_apto"
      />,
    )

    expect(screen.getByTestId('apto-estado-badge')).toHaveTextContent('Sin apto')
    expect(screen.getByText(/No posee certificado médico/i)).toBeInTheDocument()
  })

  it('renders vigente success badge', () => {
    render(
      <CertificadoCard
        socioId={1}
        aptoEstado="vigente"
        certificadoEmitidoEn="2024-01-01"
        certificadoVenceEn="2025-06-30"
      />,
    )

    expect(screen.getByTestId('apto-estado-badge')).toHaveTextContent('Vigente')
    expect(screen.getByText(/Certificado vigente cargado/i)).toBeInTheDocument()
  })

  it('renders vencido danger badge', () => {
    render(
      <CertificadoCard
        socioId={1}
        aptoEstado="vencido"
        certificadoEmitidoEn="2023-01-01"
        certificadoVenceEn="2023-12-31"
      />,
    )

    expect(screen.getByTestId('apto-estado-badge')).toHaveTextContent('Vencido')
  })

  it('shows the upload form toggle button', () => {
    render(
      <CertificadoCard
        socioId={1}
        aptoEstado="sin_apto"
      />,
    )

    expect(screen.getByText(/Subir certificado/i)).toBeInTheDocument()
  })

  it('shows the signed URL expiry notice when has apto', () => {
    render(
      <CertificadoCard
        socioId={1}
        aptoEstado="vigente"
        certificadoEmitidoEn="2024-01-01"
        certificadoVenceEn="2025-06-30"
      />,
    )

    expect(
      screen.getByText(/enlace de visualización expira en 5 minutos/i),
    ).toBeInTheDocument()
  })
  it('uploads to the certificado-medico endpoint with the backend field names', async () => {
    api.post.mockResolvedValueOnce({ data: {} })
    const onUploadSuccess = vi.fn()
    render(<CertificadoCard socioId={7} aptoEstado="sin_apto" onUploadSuccess={onUploadSuccess} />)

    fireEvent.click(screen.getByText(/Subir certificado/i))
    fireEvent.change(screen.getByTestId('emitido-en-input'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByTestId('vence-en-input'), { target: { value: '2027-10-01' } })
    const file = new File(['pdf'], 'apto.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByTestId('certificado-file-input'), { target: { files: [file] } })
    fireEvent.submit(screen.getByTestId('certificado-submit-btn').closest('form'))

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalled())
    const [url, body] = api.post.mock.calls[0]
    expect(url).toBe('/members/socios/7/certificado-medico/')
    expect(body.get('emitido_en')).toBe('2026-10-01')
    expect(body.get('vence_en')).toBe('2027-10-01')
    expect(body.get('archivo')).toBe(file)
    expect(api.patch).not.toHaveBeenCalled()
  })
})
