import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PagoRetornoPage from './PagoRetornoPage'

vi.mock('../../components/layout/MemberLayout', () => ({
  default: ({ children }) => <div data-testid="member-layout">{children}</div>,
}))

vi.mock('../../services/pagosService', () => ({
  confirmarPago: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}))

import { confirmarPago } from '../../services/pagosService'
import api from '../../services/api'

function renderPage(search = '?payment_id=555&status=approved') {
  return render(
    <MemoryRouter initialEntries={[`/socio/pago-retorno${search}`]}>
      <PagoRetornoPage />
    </MemoryRouter>
  )
}

describe('PagoRetornoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: [] })
  })

  afterEach(() => vi.useRealTimers())

  it('calls confirmar with the payment_id from the query string', async () => {
    confirmarPago.mockResolvedValue({ id: 9, estado: 'aprobado' })
    renderPage()
    await waitFor(() => expect(confirmarPago).toHaveBeenCalledWith('555'))
  })

  it('does not show success before the backend confirms, even if MP says approved', async () => {
    confirmarPago.mockReturnValue(new Promise(() => {}))
    renderPage('?payment_id=555&status=approved&collection_status=approved')
    expect(screen.getByText('Estamos confirmando tu pago')).toBeInTheDocument()
    expect(screen.queryByText('¡Pago aprobado!')).not.toBeInTheDocument()
  })

  it('shows success once the backend reports aprobado', async () => {
    confirmarPago.mockResolvedValue({ id: 9, estado: 'aprobado' })
    renderPage()
    expect(await screen.findByText('¡Pago aprobado!')).toBeInTheDocument()
    expect(screen.getByText('Ref. pago #9')).toBeInTheDocument()
  })

  it('shows rejection reported by the backend', async () => {
    confirmarPago.mockResolvedValue({ id: 9, estado: 'rechazado' })
    renderPage('?payment_id=555&status=approved')
    expect(await screen.findByText('Pago rechazado')).toBeInTheDocument()
  })

  it('falls back to polling the pago estado when confirmar fails', async () => {
    confirmarPago.mockRejectedValue(new Error('502'))
    api.get.mockImplementation((url) => {
      if (url === '/payments/pagos/mis-pagos/') {
        return Promise.resolve({ data: [{ id: 4, mp_payment_id: '555' }] })
      }
      if (url === '/payments/pagos/4/estado/') {
        return Promise.resolve({ data: { id: 4, estado: 'aprobado' } })
      }
      return Promise.reject(new Error('unexpected ' + url))
    })
    renderPage()
    expect(await screen.findByText('¡Pago aprobado!')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/payments/pagos/4/estado/')
  })

  it('shows an error state when confirmar fails and polling never resolves', async () => {
    vi.useFakeTimers()
    confirmarPago.mockRejectedValue(new Error('502'))
    api.get.mockRejectedValue(new Error('down'))
    renderPage()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000 * 9)
    })
    expect(screen.getByText('No pudimos verificar el pago')).toBeInTheDocument()
    expect(screen.queryByText('¡Pago aprobado!')).not.toBeInTheDocument()
  })

  it('keeps the previous behaviour when payment_id is absent (no confirmar call)', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/payments/pagos/mis-pagos/') return Promise.resolve({ data: [{ id: 2 }] })
      return Promise.resolve({ data: { id: 2, estado: 'pendiente' } })
    })
    renderPage('')
    expect(await screen.findByText('Pago en proceso')).toBeInTheDocument()
    expect(confirmarPago).not.toHaveBeenCalled()
  })
})
