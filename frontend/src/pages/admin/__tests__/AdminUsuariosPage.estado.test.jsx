import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminUsuariosPage from '../AdminUsuariosPage'

const base = { first_name: 'Ana', last_name: 'Paz', rol: 'administrador', is_active: true }

const STAFF = [
  { ...base, id: 1, email: 'clave@gym.test', has_usable_password: true, has_social_login: false },
  { ...base, id: 2, email: 'google@gym.test', has_usable_password: false, has_social_login: true },
  { ...base, id: 3, email: 'pendiente@gym.test', has_usable_password: false, has_social_login: false },
]

vi.mock('../../../hooks/queries/useStaff', () => ({
  useStaffList: () => ({ data: STAFF, isLoading: false }),
  useResendActivation: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../../../components/layout/AppLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../../../components/layout/TopBar', () => ({ default: ({ title }) => <h1>{title}</h1> }))
vi.mock('../../../components/admin/StaffFormModal', () => ({ default: () => null }))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminUsuariosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminUsuariosPage > estado de activación', () => {
  it('un usuario que entra con Google figura activo, no pendiente', () => {
    renderPage()
    expect(screen.getAllByText(/Activo · Google/i)).not.toHaveLength(0)
  })

  it('solo quien no tiene contraseña ni Google figura como pendiente', () => {
    renderPage()
    expect(screen.getAllByText(/Pendiente activación/i)).toHaveLength(1)
  })

  it('solo el usuario pendiente tiene el botón de reenviar activación', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: /reenviar activación/i })).toHaveLength(1)
  })
})
