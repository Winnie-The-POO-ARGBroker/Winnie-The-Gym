/**
 * Tests for AuthActivationExpiredPage — fix #233 (BK-SOC-11)
 * Contract test 10.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render } from '@testing-library/react'
import AuthActivationExpiredPage from './AuthActivationExpiredPage'

vi.mock('../components/ui/WinnieLogo', () => ({
  default: () => <div data-testid="winnie-logo">WinnieLogo</div>,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderPage(state = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/auth/link-invalido', state }]}>
      <Routes>
        <Route path="/auth/link-invalido" element={<AuthActivationExpiredPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AuthActivationExpiredPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Contract test 10
  it('shows "Este enlace ya no es válido o venció" with CTA to request new link', () => {
    renderPage({ from: 'reset' })

    expect(screen.getByText(/Este enlace ya no es válido o venció/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pedir un nuevo enlace/i })).toBeInTheDocument()
  })

  it('CTA navigates to /forgot-password when flow was reset', () => {
    renderPage({ from: 'reset' })

    screen.getByRole('button', { name: /Pedir un nuevo enlace/i }).click()

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password')
  })

  it('CTA navigates to /login when flow was activation', () => {
    renderPage({ from: 'activation' })

    screen.getByRole('button', { name: /Pedir un nuevo enlace/i }).click()

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('renders without state gracefully and shows CTA', () => {
    renderPage()

    expect(screen.getByText(/Este enlace ya no es válido o venció/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pedir un nuevo enlace/i })).toBeInTheDocument()
  })
})
