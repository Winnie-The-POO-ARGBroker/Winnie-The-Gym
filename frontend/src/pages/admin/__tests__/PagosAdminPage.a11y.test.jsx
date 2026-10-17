/**
 * #351 — Pagos filters must expose an accessible name (WCAG 1.3.1, 3.3.2, 4.1.2).
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PagosAdminPage from '../PagosAdminPage'

vi.mock('../../../hooks/queries/usePagos', () => ({
  usePagosAdmin: vi.fn(),
  usePagosTotales: vi.fn(),
  useAnularPagoMutation: vi.fn(),
}))
vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))
vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ title, rightContent }) => (
    <div>
      <h1>{title}</h1>
      {rightContent}
    </div>
  ),
}))
vi.mock('../../../services/reportsService', () => ({
  exportReport: vi.fn().mockResolvedValue({ success: true, filename: 'test.csv' }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn() },
}))

import { usePagosAdmin, usePagosTotales, useAnularPagoMutation } from '../../../hooks/queries/usePagos'

describe('PagosAdminPage filters accessibility (#351)', () => {
  beforeEach(() => {
    usePagosAdmin.mockReturnValue({ data: { results: [], count: 0 }, isLoading: false, isError: false })
    usePagosTotales.mockReturnValue({ data: {}, isLoading: false })
    useAnularPagoMutation.mockReturnValue({ mutate: vi.fn(), isPending: false })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <PagosAdminPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  })

  it('names the search input', () => {
    expect(screen.getByRole('textbox', { name: /buscar socio/i })).toBeInTheDocument()
  })

  it('names the estado and método selects', () => {
    expect(screen.getByRole('combobox', { name: /^estado$/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /^método$/i })).toBeInTheDocument()
  })

  it('names the Desde and Hasta date inputs', () => {
    expect(screen.getByLabelText(/^desde$/i)).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText(/^hasta$/i)).toHaveAttribute('type', 'date')
  })
})
