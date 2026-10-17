import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from '../RegisterPage'

vi.mock('../../services/api', () => ({ default: { post: vi.fn() } }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../hooks/useAuth', () => ({ default: () => ({ setAuth: vi.fn() }) }))

describe('RegisterPage accessibility (#345)', () => {
  it.each([
    [/^email$/i, 'register-email'],
    [/^contraseña$/i, 'register-password'],
    [/^confirmar contraseña$/i, 'register-password-confirm'],
    [/^nombre$/i, 'register-nombre'],
    [/^apellido$/i, 'register-apellido'],
    [/^dni$/i, 'register-dni'],
    [/^teléfono/i, 'register-telefono'],
  ])('exposes the field labelled %s with a stable test id', (label, testId) => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    )
    const field = screen.getByLabelText(label)
    expect(field).toBe(screen.getByTestId(testId))
  })
})
