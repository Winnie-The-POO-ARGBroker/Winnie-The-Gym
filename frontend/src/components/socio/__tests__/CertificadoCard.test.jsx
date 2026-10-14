/**
 * Tests obligatorios PR6 (contrato #15):
 *   CertificadoCard > renders apto_estado badge with vencimiento date
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CertificadoCard from '../CertificadoCard'

// Mock the api module to isolate network calls
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
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
})
