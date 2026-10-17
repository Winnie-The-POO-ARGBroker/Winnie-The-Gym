/**
 * #352 — Mi Perfil form fields must have an associated label (WCAG 1.3.1, 3.3.2, 4.1.2).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import ProfilePage from './ProfilePage'
import { renderWithProviders, resetAllStores, makeAuthedUser } from '../test/test-utils'

vi.mock('../hooks/queries/useProfile', () => ({
  useProfile: vi.fn(),
  useUpdateProfile: vi.fn(),
}))
vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
vi.mock('../hooks/useAuth', () => ({ default: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../components/auth/ChangePasswordModal', () => ({ default: () => null }))
vi.mock('../components/layout/AppLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../components/layout/TopBar', () => ({ default: ({ title }) => <h1>{title}</h1> }))

import { useProfile, useUpdateProfile } from '../hooks/queries/useProfile'
import useAuth from '../hooks/useAuth'

function setup(profile, user) {
  useAuth.mockReturnValue({ user, accessToken: 't', refreshToken: 'r', setAuth: vi.fn(), clearAuth: vi.fn() })
  useProfile.mockReturnValue({ data: profile, isPending: false, refetch: vi.fn() })
  useUpdateProfile.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  renderWithProviders(<ProfilePage />)
}

describe('ProfilePage form labels (#352)', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  it('socio view: every editable field is reachable by its label', () => {
    setup(
      { id: 1, nombre: 'Juan', apellido: 'Pérez', email: 'j@w.local', dni: '1', telefono: '11', rol: 'socio' },
      makeAuthedUser('socio')
    )

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Juan')
    expect(screen.getByLabelText(/^apellido$/i)).toHaveValue('Pérez')
    expect(screen.getByLabelText(/^teléfono$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fecha de nacimiento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^género$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contacto emergencia — nombre/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contacto emergencia — teléfono/i)).toBeInTheDocument()
  })

  it('staff view: first and last name are reachable by their label', () => {
    setup(
      {
        id: 2,
        first_name: 'Ana',
        last_name: 'Gómez',
        email: 'a@w.local',
        rol: 'administrador',
        is_staff_profile: true,
      },
      makeAuthedUser('admin')
    )

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Ana')
    expect(screen.getByLabelText(/^apellido$/i)).toHaveValue('Gómez')
  })
})
