/**
 * Tests for ProfilePage.
 *
 * Satisfies REQ-2.1 (≥ 10 tests).
 * Mocked: useProfile, useUpdateProfile hooks; services/api; useAuth
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import ProfilePage from './ProfilePage'
import { renderWithProviders, resetAllStores, makeAuthedUser } from '../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/queries/useProfile', () => ({
  useProfile: vi.fn(),
  useUpdateProfile: vi.fn(),
  PROFILE_KEY: ['profile'],
}))

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('../hooks/useAuth', () => ({
  default: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../components/auth/ChangePasswordModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="change-pwd-modal">ChangePasswordModal</div> : null,
}))

vi.mock('../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../components/layout/TopBar', () => ({
  default: ({ title }) => <h1>{title}</h1>,
}))

import { useProfile, useUpdateProfile } from '../hooks/queries/useProfile'
import useAuth from '../hooks/useAuth'
import api from '../services/api'

const mockProfile = {
  id: 1,
  nombre: 'Juan',
  apellido: 'Pérez',
  email: 'juan@winnie.local',
  dni: '12345678',
  telefono: '1111111111',
  rol: 'socio',
  certificado_medico_url: null,
  foto: null,
}

function setupAuthMock(user = makeAuthedUser('socio')) {
  useAuth.mockReturnValue({
    user,
    accessToken: 'tok',
    refreshToken: 'ref',
    setAuth: vi.fn(),
    clearAuth: vi.fn(),
  })
}

describe('ProfilePage', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupAuthMock()
    useUpdateProfile.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  // ── 1. Happy path — profile renders name, email, role ──────────────────────
  it('renders user name, email, and role when profile query resolves', async () => {
    useProfile.mockReturnValue({ data: mockProfile, isPending: false, refetch: vi.fn() })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })
    expect(screen.getByText('juan@winnie.local')).toBeInTheDocument()
    expect(screen.getByText('Socio')).toBeInTheDocument()
  })

  // ── 2. Loading state shows skeletons ───────────────────────────────────────
  it('shows skeleton UI when profile query is loading', () => {
    useProfile.mockReturnValue({ data: undefined, isPending: true, refetch: vi.fn() })

    renderWithProviders(<ProfilePage />)

    // In loading state the form is not rendered, just skeletons
    expect(screen.queryByText('Datos personales')).not.toBeInTheDocument()
  })

  // ── 3. Error state — shows "Datos personales" section without crashing ────
  it('renders without crashing when profile data is undefined (not loading)', async () => {
    useProfile.mockReturnValue({ data: undefined, isPending: false, refetch: vi.fn() })

    expect(() => {
      renderWithProviders(<ProfilePage />)
    }).not.toThrow()

    // The form section header should be present even without profile data
    expect(screen.getByText('Datos personales')).toBeInTheDocument()
  })

  // ── 4. Empty-state — no certificado medico ─────────────────────────────────
  it('shows "no certificado" message when apto_estado is sin_apto', async () => {
    useProfile.mockReturnValue({
      data: { ...mockProfile, tiene_certificado: false, apto_estado: 'sin_apto' },
      isPending: false,
      refetch: vi.fn(),
    })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText(/No posee certificado médico/i)).toBeInTheDocument()
    })
  })

  // ── 5. Certificado uploaded (stored in path, legacy url empty) ─────────────
  it('shows "Certificado vigente cargado" when apto_estado is vigente', async () => {
    useProfile.mockReturnValue({
      data: {
        ...mockProfile,
        certificado_medico_url: '',
        tiene_certificado: true,
        apto_estado: 'vigente',
        certificado_emitido_en: '2026-10-01',
        certificado_vence_en: '2027-10-01',
      },
      isPending: false,
      refetch: vi.fn(),
    })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText(/Certificado vigente cargado/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Ver archivo/i)).toBeInTheDocument()
  })

  // ── 6. Non-socio role hides certificado section ────────────────────────────
  it('does not render certificado section for admin role', async () => {
    useProfile.mockReturnValue({
      data: { ...mockProfile, rol: 'administrador', is_staff_profile: true },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    setupAuthMock(makeAuthedUser('admin'))

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.queryByText(/Certificado médico/i)).not.toBeInTheDocument()
    })
  })

  // ── 7. Edit form renders inputs ────────────────────────────────────────────
  it('renders nombre and apellido inputs when profile loads', async () => {
    useProfile.mockReturnValue({ data: mockProfile, isPending: false, refetch: vi.fn() })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Datos personales')).toBeInTheDocument()
    })
    // The form inputs should exist
    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Apellido')).toBeInTheDocument()
  })

  // ── 8. Save button disabled when form is pristine ─────────────────────────
  it('save button is disabled when form is not dirty', async () => {
    useProfile.mockReturnValue({ data: mockProfile, isPending: false, refetch: vi.fn() })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Guardar cambios')).toBeInTheDocument()
    })

    const saveBtn = screen.getByText('Guardar cambios').closest('button')
    expect(saveBtn).toBeDisabled()
  })

  // ── 9. Change password button opens modal ─────────────────────────────────
  it('clicking "Cambiar contraseña" opens the ChangePasswordModal', async () => {
    useProfile.mockReturnValue({ data: mockProfile, isPending: false, refetch: vi.fn() })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Cambiar contraseña')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cambiar contraseña'))

    expect(screen.getByTestId('change-pwd-modal')).toBeInTheDocument()
  })

  // ── 10. DNI is read-only (display only) ───────────────────────────────────
  it('displays DNI as read-only field with value from profile', async () => {
    useProfile.mockReturnValue({ data: mockProfile, isPending: false, refetch: vi.fn() })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('DNI')).toBeInTheDocument()
    })
    expect(screen.getByText('12345678')).toBeInTheDocument()
  })

  // ── 11. Subir certificado button appears for socio ─────────────────────────
  it('shows upload certificate button for socio role', async () => {
    useProfile.mockReturnValue({ data: mockProfile, isPending: false, refetch: vi.fn(), isError: false })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText(/Subir certificado/i)).toBeInTheDocument()
    })
  })

  // ── Contract test 3 — fix #160 ────────────────────────────────────────────
  it('renders staff shape when user.rol is administrador', async () => {
    const staffProfile = {
      email: 'admin@winnie.local',
      rol: 'administrador',
      first_name: 'Carlos',
      last_name: 'Admin',
      foto: null,
      is_staff_profile: true,
    }
    useProfile.mockReturnValue({ data: staffProfile, isPending: false, isError: false, refetch: vi.fn() })
    setupAuthMock(makeAuthedUser('admin'))

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Carlos Admin')).toBeInTheDocument()
    })
    // Email appears in both display header and read-only field
    expect(screen.getAllByText('admin@winnie.local').length).toBeGreaterThan(0)
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    // Staff profile does NOT show certificado section
    expect(screen.queryByText(/Certificado médico/i)).not.toBeInTheDocument()
  })

  // ── Contract test 4 — fix #160 ────────────────────────────────────────────
  it('shows "Reintentar" button on network error', async () => {
    useProfile.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: vi.fn() })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })
  })

  // ── Certificate upload goes through CertificadoCard ───────────────────────
  it('certificado upload: posts dates + file and invalidates profile and membership queries', async () => {
    api.post.mockResolvedValueOnce({ data: {} })
    useProfile.mockReturnValue({ data: mockProfile, isPending: false, isError: false, refetch: vi.fn() })

    const { queryClient } = renderWithProviders(<ProfilePage />)
    vi.spyOn(queryClient, 'invalidateQueries')

    fireEvent.click(await screen.findByText(/Subir certificado/i))
    fireEvent.change(screen.getByTestId('emitido-en-input'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByTestId('vence-en-input'), { target: { value: '2027-10-01' } })
    const file = new File(['pdf'], 'cert.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByTestId('certificado-file-input'), { target: { files: [file] } })
    fireEvent.submit(screen.getByTestId('certificado-submit-btn').closest('form'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/members/socios/1/certificado-medico/',
        expect.any(FormData),
        expect.anything(),
      )
    })
    await waitFor(() => {
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['profile'] })
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['membresias', 'me'] })
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['socioMembership'] })
    })
  })
})
