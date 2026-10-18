/**
 * Tests for GestionSociosPage (recepcion role).
 *
 * Covers both the listado tab and the Alta en Recepción form flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent, act } from '@testing-library/react'
import GestionSociosPage from './GestionSociosPage'
import { renderWithProviders, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/queries/useSociosData', () => ({
  useSociosList: vi.fn(),
  useSocioMutations: vi.fn(),
}))

vi.mock('../../hooks/queries/usePlanesAdmin', () => ({
  usePlanesQuery: vi.fn(),
}))

vi.mock('../../services/pagosService', () => ({
  cobrarManual: vi.fn(),
}))

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('../../components/layout/TopBar', () => ({
  default: ({ title, rightContent }) => (
    <div>
      <h1>{title}</h1>
      {rightContent}
    </div>
  ),
}))

vi.mock('../../components/admin/SocioDetailModal', () => ({
  default: ({ isOpen, socio }) =>
    isOpen && socio ? <div data-testid="socio-detail-modal">{socio.nombre}</div> : null,
}))

vi.mock('../../components/admin/SocioColumns', () => ({
  getSocioColumns: () => [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'estado', label: 'Estado' },
  ],
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useSociosList, useSocioMutations } from '../../hooks/queries/useSociosData'
import { usePlanesQuery } from '../../hooks/queries/usePlanesAdmin'
import { cobrarManual } from '../../services/pagosService'

const mockSocios = [
  { id: 1, nombre: 'Ana', apellido: 'García', estado: 'activo', dni: '11111111' },
  { id: 2, nombre: 'Luis', apellido: 'Herrera', estado: 'activo', dni: '22222222' },
]

const mockPlanes = [
  { id: 1, nombre: 'Básico', precio: 8000, activo: true },
  { id: 2, nombre: 'Premium', precio: 12000, activo: true },
]

const defaultMutations = {
  create: { mutateAsync: vi.fn().mockResolvedValue({ id: 99, nombre: 'Ana', apellido: 'García', numero_socio: 'S-00099', email: '' }), isPending: false },
  patch: { mutateAsync: vi.fn(), isPending: false },
  baja: { mutateAsync: vi.fn(), isPending: false },
  certificado: { mutateAsync: vi.fn(), isPending: false },
  reactivar: { mutateAsync: vi.fn(), isPending: false },
}

function setupMocks(overrides = {}) {
  useSociosList.mockReturnValue({
    data: { count: 2, results: mockSocios },
    isLoading: false,
    ...overrides.list,
  })
  useSocioMutations.mockReturnValue({ ...defaultMutations, ...overrides.mutations })
  usePlanesQuery.mockReturnValue({
    data: mockPlanes,
    isLoading: false,
    ...overrides.planes,
  })
  cobrarManual.mockResolvedValue({ id: 1 })
}

describe('GestionSociosPage', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Page title ─────────────────────────────────────────────────────────
  it('renders page title "Recepción — Socios"', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Recepción — Socios')).toBeInTheDocument()
    })
  })

  // ── 2. Tab navigation renders ─────────────────────────────────────────────
  it('renders "Listado de Socios" and "Alta en Recepción" tabs', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Listado de Socios')).toBeInTheDocument()
      expect(screen.getByText('Alta en Recepción')).toBeInTheDocument()
    })
  })

  // ── 3. Socio list renders in listado tab ──────────────────────────────────
  it('shows socio names in the listado tab', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
      expect(screen.getByText('Luis')).toBeInTheDocument()
    })
  })

  // ── 4. Loading state ──────────────────────────────────────────────────────
  it('shows loading skeleton when list query is loading', async () => {
    setupMocks({ list: { data: undefined, isLoading: true } })

    renderWithProviders(<GestionSociosPage />)

    await waitFor(() => {
      const cells = document.querySelectorAll('td')
      expect(cells.length).toBeGreaterThan(0)
    })
  })

  // ── 5. Empty state when list is empty ─────────────────────────────────────
  it('shows empty state when socios list is empty', async () => {
    setupMocks({ list: { data: { count: 0, results: [] }, isLoading: false } })

    renderWithProviders(<GestionSociosPage />)

    await waitFor(() => {
      expect(screen.getByText(/sin socios/i)).toBeInTheDocument()
    })
  })

  // ── 6. Column headers render ──────────────────────────────────────────────
  it('renders table column headers', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Nombre')).toBeInTheDocument()
      expect(screen.getByText('Estado')).toBeInTheDocument()
    })
  })

  // ── 7. Clicking "Alta en Recepción" tab switches to form ─────────────────
  it('switches to form tab when "Alta en Recepción" is clicked', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Alta en Recepción')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByText('Datos del socio')).toBeInTheDocument()
    })
  })

  // ── 8. Form tab shows plan select ─────────────────────────────────────────
  it('form tab renders plan select with planes from API', async () => {
    renderWithProviders(<GestionSociosPage />)

    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByTestId('plan-select')).toBeInTheDocument()
    })
  })

  // ── 9. Clicking a row opens detail modal ──────────────────────────────────
  it('opens SocioDetailModal when view-detail button is clicked', async () => {
    renderWithProviders(<GestionSociosPage />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByTitle('Ver detalle del socio')
    fireEvent.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('socio-detail-modal')).toBeInTheDocument()
    })
  })

  // ── 10. "Nuevo Socio" button appears in listado tab ───────────────────────
  it('renders "Nuevo Socio" button in listado tab', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByText('Nuevo Socio')).toBeInTheDocument()
    })
  })

  // ── 11. Search bar present ────────────────────────────────────────────────
  it('renders search bar in listado tab', async () => {
    renderWithProviders(<GestionSociosPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar socio/i)).toBeInTheDocument()
    })
  })

  // ── 12. Cancel button in form tab returns to listado ──────────────────────
  it('clicking Cancel in form tab returns to listado tab', async () => {
    renderWithProviders(<GestionSociosPage />)

    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancelar'))

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })
  })

  // ── Contract test 5 — fix #223 ────────────────────────────────────────────
  it('alta recepción creates socio + cobro successfully', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      id: 99,
      nombre: 'Eduardo',
      apellido: 'Nuevo',
      numero_socio: 'S-00099',
      email: '',
      usuario_id: 55,
    })
    useSocioMutations.mockReturnValue({
      ...defaultMutations,
      create: { mutateAsync: mockCreate, isPending: false },
    })
    cobrarManual.mockResolvedValue({ id: 10 })

    renderWithProviders(<GestionSociosPage />)

    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByTestId('plan-select')).toBeInTheDocument()
    })

    // Fill the form
    fireEvent.change(screen.getByPlaceholderText('Ej. Ana'), { target: { value: 'Eduardo' } })
    fireEvent.change(screen.getByPlaceholderText('Ej. González'), { target: { value: 'Nuevo' } })
    fireEvent.change(screen.getByTestId('dni-input'), { target: { value: '33333333' } })
    fireEvent.change(screen.getByTestId('telefono-input'), { target: { value: '+5493511234567' } })
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('medio-select'), { target: { value: 'transferencia' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-alta'))
    })

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Eduardo', apellido: 'Nuevo', dni: '33333333' })
      )
      expect(cobrarManual).toHaveBeenCalledWith(
        expect.objectContaining({ socio_id: 99, plan_id: 1, medio: 'transferencia' })
      )
    })
  })

  // ── Contract test 6 — fix #223 ────────────────────────────────────────────
  it('alta recepción shows partial failure UI when cobro fails', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      id: 99,
      nombre: 'Eduardo',
      apellido: 'Nuevo',
      numero_socio: 'S-00099',
      email: 'edu@test.com',
      usuario_id: 55,
    })
    useSocioMutations.mockReturnValue({
      ...defaultMutations,
      create: { mutateAsync: mockCreate, isPending: false },
    })
    cobrarManual.mockRejectedValue({
      response: { data: { detail: 'Saldo insuficiente' } },
    })

    renderWithProviders(<GestionSociosPage />)

    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByTestId('plan-select')).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Ej. Ana'), { target: { value: 'Eduardo' } })
    fireEvent.change(screen.getByPlaceholderText('Ej. González'), { target: { value: 'Nuevo' } })
    fireEvent.change(screen.getByTestId('dni-input'), { target: { value: '33333333' } })
    fireEvent.change(screen.getByTestId('telefono-input'), { target: { value: '+5493511234567' } })
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('medio-select'), { target: { value: 'transferencia' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-alta'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('partial-failure-card')).toBeInTheDocument()
    })

    // Partial failure card should have "Ir a Cobros Manuales" button
    expect(screen.getByText(/Ir a Cobros Manuales/i)).toBeInTheDocument()
    // Should show cobro error
    expect(screen.getByText(/Saldo insuficiente/i)).toBeInTheDocument()
  })

  // ── Issue alta socio: validación de campos obligatorios ───────────────────
  it('alta recepción bloquea el envío vacío y muestra errores sin llamar a la API', async () => {
    const mockCreate = vi.fn()
    useSocioMutations.mockReturnValue({
      ...defaultMutations,
      create: { mutateAsync: mockCreate, isPending: false },
    })

    renderWithProviders(<GestionSociosPage />)
    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByTestId('submit-alta')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-alta'))
    })

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El apellido es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('Seleccioná un plan.')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
    expect(cobrarManual).not.toHaveBeenCalled()
  })

  // ── Issue alta socio: retroalimentación tras alta exitosa ─────────────────
  it('alta recepción exitosa vuelve al listado (feedback de éxito)', async () => {
    renderWithProviders(<GestionSociosPage />)
    fireEvent.click(screen.getByText('Alta en Recepción'))

    await waitFor(() => {
      expect(screen.getByTestId('plan-select')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Ej. Ana'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText('Ej. González'), { target: { value: 'Gonzalez' } })
    fireEvent.change(screen.getByTestId('dni-input'), { target: { value: '30111222' } })
    fireEvent.change(screen.getByTestId('telefono-input'), { target: { value: '+5493511234567' } })
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'ana.gonzalez@mail.com' } })
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('medio-select'), { target: { value: 'efectivo' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-alta'))
    })

    await waitFor(() => {
      expect(defaultMutations.create.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ dni: '30111222', email: 'ana.gonzalez@mail.com' })
      )
      expect(cobrarManual).toHaveBeenCalledWith(
        expect.objectContaining({ socio_id: 99, plan_id: 2, monto: 12000, medio: 'efectivo' })
      )
      // El formulario se cierra y se vuelve al listado
      expect(screen.queryByText('Datos del socio')).not.toBeInTheDocument()
      expect(screen.getByText('Listado de Socios')).toBeInTheDocument()
    })
  })

  // ── Medio de pago: required and sent on both charge calls ────────────────
  async function fillAltaWithoutMedio() {
    fireEvent.click(screen.getByText('Alta en Recepción'))
    await waitFor(() => {
      expect(screen.getByTestId('plan-select')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByPlaceholderText('Ej. Ana'), { target: { value: 'Eduardo' } })
    fireEvent.change(screen.getByPlaceholderText('Ej. González'), { target: { value: 'Nuevo' } })
    fireEvent.change(screen.getByTestId('dni-input'), { target: { value: '33333333' } })
    fireEvent.change(screen.getByTestId('telefono-input'), { target: { value: '+5493511234567' } })
    fireEvent.change(screen.getByTestId('plan-select'), { target: { value: '1' } })
  }

  it('alta recepción exige medio de pago y no crea el socio si falta', async () => {
    const mockCreate = vi.fn()
    useSocioMutations.mockReturnValue({
      ...defaultMutations,
      create: { mutateAsync: mockCreate, isPending: false },
    })

    renderWithProviders(<GestionSociosPage />)
    await fillAltaWithoutMedio()

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-alta'))
    })

    expect(screen.getByText('Seleccioná el medio de pago.')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
    expect(cobrarManual).not.toHaveBeenCalled()
  })

  it('alta recepción ofrece los mismos medios que el cobro manual', async () => {
    renderWithProviders(<GestionSociosPage />)
    fireEvent.click(screen.getByText('Alta en Recepción'))

    const select = await screen.findByTestId('medio-select')
    const labels = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(labels).toEqual(expect.arrayContaining([
      'Efectivo', 'Transferencia bancaria', 'Débito', 'Crédito', 'Otro',
    ]))
  })

  it('"Reintentar cobro" vuelve a enviar el medio elegido', async () => {
    useSocioMutations.mockReturnValue({
      ...defaultMutations,
      create: {
        mutateAsync: vi.fn().mockResolvedValue({
          id: 99, nombre: 'Eduardo', apellido: 'Nuevo', numero_socio: 'S-00099', email: '',
        }),
        isPending: false,
      },
    })
    cobrarManual
      .mockRejectedValueOnce({ response: { data: { detail: 'Caída de red' } } })
      .mockResolvedValueOnce({ id: 11 })

    renderWithProviders(<GestionSociosPage />)
    await fillAltaWithoutMedio()
    fireEvent.change(screen.getByTestId('medio-select'), { target: { value: 'debito' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-alta'))
    })
    await screen.findByTestId('partial-failure-card')

    await act(async () => {
      fireEvent.click(screen.getByText('Reintentar cobro'))
    })

    await waitFor(() => {
      expect(cobrarManual).toHaveBeenCalledTimes(2)
    })
    expect(cobrarManual).toHaveBeenLastCalledWith(
      expect.objectContaining({ socio_id: 99, plan_id: 1, medio: 'debito' })
    )
  })
})
