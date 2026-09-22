/**
 * Tests for NotFoundPage.
 *
 * Coverage uplift: 0% → ~85% (simple page, no complex dependencies).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import NotFoundPage from './NotFoundPage'
import { renderWithProviders, resetAllStores } from '../test/test-utils'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../components/ui/WinnieLogo', () => ({
  default: ({ size }) => <div data-testid={`logo-${size}`}>WinnieLogo</div>,
}))

describe('NotFoundPage', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  it('renders 404 text', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders "Página no encontrada" heading', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
  })

  it('renders the description message', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByText(/La página que buscás no existe/i)).toBeInTheDocument()
  })

  it('renders "Volver al dashboard" button', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByText('Volver al dashboard')).toBeInTheDocument()
  })

  it('calls navigate("/dashboard") when button is clicked', () => {
    renderWithProviders(<NotFoundPage />)
    fireEvent.click(screen.getByText('Volver al dashboard'))
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('renders WinnieLogo', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByTestId('logo-md')).toBeInTheDocument()
  })
})
