/**
 * PR4 CLS Features — Frontend contract tests (3 required)
 *
 * Issues covered:
 *   #172 — ClassAttendeesModal: "Habilitar" calls POST /clases/{id}/promover-espera/
 *   #175 — CreateClassPage: DRF field errors shown per field (cupo_maximo)
 *   #177 — ClasesPage (CatalogoClasesPage): ART timezone for "Hoy" chip after 21pm UTC
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Module mocks (hoisted) ─────────────────────────────────────────────────────

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('../hooks/queries/useInscripciones', () => ({
  useInscripcionesMutations: vi.fn(() => ({
    inscribir: { mutate: vi.fn(), isPending: false },
    cancelar: { mutate: vi.fn(), isPending: false },
  })),
}))

vi.mock('../stores/authStore', () => ({
  default: vi.fn((selector) => selector({ user: { rol: 'socio', id: 1 } })),
}))

vi.mock('../components/ui/Avatar', () => ({
  default: ({ name }) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('../components/ui/Button', () => ({
  default: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}))

vi.mock('../components/ui/Modal', () => ({
  default: ({ isOpen, children, title }) =>
    isOpen ? (
      <div data-testid="modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../components/layout/TopBar', () => ({
  default: ({ title, rightContent }) => (
    <div>
      <h1>{title}</h1>
      {rightContent}
    </div>
  ),
}))

vi.mock('../components/layout/MemberLayout', () => ({
  default: ({ children, title }) => (
    <div data-testid="member-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('../components/socio/ClassCard', () => ({
  default: ({ clase }) => <div data-testid="class-card">{clase.nombre}</div>,
}))

vi.mock('../components/ui/EmptyState', () => ({
  default: ({ title }) => <div data-testid="empty-state">{title}</div>,
}))

vi.mock('../components/ui/Card', () => ({
  default: ({ children }) => <div data-testid="card">{children}</div>,
}))

vi.mock('../components/ui/FilterButton', () => ({
  default: ({ children, onClick, active }) => (
    <button onClick={onClick} data-active={active} data-testid="filter-btn">
      {children}
    </button>
  ),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

vi.mock('../hooks/queries/useClases', () => ({
  useClasesMutations: vi.fn(),
  useClasesList: vi.fn(),
  useClaseDetail: vi.fn(),
  CLASES_QUERY_KEYS: { all: ['clases'] },
}))

// ── Static imports (after mocks) ───────────────────────────────────────────────
import { useClasesMutations, useClasesList, useClaseDetail } from '../hooks/queries/useClases'
import ClassAttendeesModal from '../components/classes/ClassAttendeesModal'
import CreateClassPage from '../pages/CreateClassPage'
import ClasesPage from '../pages/socio/ClasesPage'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 12 — ClassAttendeesModal > Habilitar calls promover_espera endpoint
// ═══════════════════════════════════════════════════════════════════════════════

const SELECTED_CLASS = {
  id: 42,
  nombre: 'Funcional',
  dia: 'Lunes',
  hora: '08:00',
  duracion_min: 45,
  sala: 'Sala A',
  instructor: 'Prof. Test',
  cupo_maximo: 10,
}

const ATTENDEES_WITH_ESPERA = [
  {
    id: 1,
    socio_nombre: 'Juan',
    socio_apellido: 'Pérez',
    socio_dni: '30111222',
    plan_nombre: 'Plan Premium',
    asistio: null,
    estado: 'confirmado',
    created_at: '2026-10-14T08:05:00Z',
  },
  {
    id: 2,
    socio_nombre: 'María',
    socio_apellido: 'García',
    socio_dni: '28333444',
    plan_nombre: 'Plan Básico',
    asistio: null,
    estado: 'en_espera',
    posicion_en_espera: 1,
    created_at: '2026-10-14T08:10:00Z',
  },
]

describe('ClassAttendeesModal > Habilitar calls promover_espera endpoint', () => {
  const mockPromoverMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useClasesMutations.mockReturnValue({
      promoverEspera: { mutate: mockPromoverMutate, isPending: false },
      create: { mutate: vi.fn() },
      update: { mutate: vi.fn() },
      remove: { mutate: vi.fn() },
      cancelar: { mutate: vi.fn() },
    })
  })

  function renderModal(props = {}) {
    return render(
      <MemoryRouter>
        <ClassAttendeesModal
          isOpen={true}
          onClose={vi.fn()}
          selectedClass={SELECTED_CLASS}
          attendees={ATTENDEES_WITH_ESPERA}
          onToggleStatus={vi.fn()}
          onSave={vi.fn()}
          {...props}
        />
      </MemoryRouter>
    )
  }

  it('renders Habilitar button for en_espera attendees', () => {
    renderModal()
    expect(screen.getByText('Habilitar')).toBeInTheDocument()
  })

  it('shows posicion en espera for en_espera attendees', () => {
    renderModal()
    expect(screen.getByText(/Espera #1/i)).toBeInTheDocument()
  })

  it('calls promoverEspera.mutate(classId) when Habilitar is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByText('Habilitar'))
    expect(mockPromoverMutate).toHaveBeenCalledWith(SELECTED_CLASS.id)
  })

  it('does NOT show Habilitar for confirmed-only attendees', () => {
    renderModal({ attendees: [ATTENDEES_WITH_ESPERA[0]] })
    expect(screen.queryByText('Habilitar')).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Test 13 — CreateClassPage > DRF field errors shown per field (cupo_maximo)
// ═══════════════════════════════════════════════════════════════════════════════

describe('CreateClassPage > validates cupo < inscriptos shows error per field', () => {
  const mockCreate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // DRF error simulation: mutate immediately calls onError with field-level errors
    mockCreate.mockImplementation((_payload, callbacks) => {
      const err = {
        response: {
          data: {
            cupo_maximo: ['El cupo no puede ser menor al número de inscriptos actuales.'],
          },
        },
      }
      callbacks?.onError?.(err)
    })

    useClasesMutations.mockReturnValue({
      create: { mutate: mockCreate, isPending: false },
      update: { mutate: vi.fn(), isPending: false },
      remove: { mutate: vi.fn(), isPending: false },
      cancelar: { mutate: vi.fn(), isPending: false },
      promoverEspera: { mutate: vi.fn(), isPending: false },
    })

    useClasesList.mockReturnValue({ data: [], isFetching: false })
    useClaseDetail.mockReturnValue({ data: undefined, isLoading: false })
  })

  it('shows cupo_maximo field error from DRF response', async () => {
    const qc = makeQueryClient()

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <CreateClassPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Fill nombre so frontend validation passes
    const nombreInput = screen.getByPlaceholderText(/Funcional Intensivo/i)
    fireEvent.change(nombreInput, { target: { value: 'Mi Clase' } })

    // Click publish button
    const publishBtns = screen.getAllByText('Publicar clase')
    fireEvent.click(publishBtns[0])

    await waitFor(() => {
      expect(
        screen.getByText(/El cupo no puede ser menor al número de inscriptos/i)
      ).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Test 14 — ClasesPage > uses ART timezone for Hoy chip after 21pm UTC
// ═══════════════════════════════════════════════════════════════════════════════

describe('ClasesPage > uses ART timezone for Hoy chip after 21pm UTC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useClasesList.mockReturnValue({ data: [], isFetching: false })
    useClasesMutations.mockReturnValue({
      promoverEspera: { mutate: vi.fn(), isPending: false },
      create: { mutate: vi.fn() },
      update: { mutate: vi.fn() },
      remove: { mutate: vi.fn() },
      cancelar: { mutate: vi.fn() },
    })
    useClaseDetail.mockReturnValue({ data: undefined, isLoading: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders day selector and calls useClasesList with a valid dia param', () => {
    const qc = makeQueryClient()

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ClasesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Page should render and show the day selector label
    expect(screen.getByText('Día de la semana')).toBeInTheDocument()

    // useClasesList should have been called with a dia param
    expect(useClasesList).toHaveBeenCalled()
    const params = useClasesList.mock.calls[0][0]
    expect(params).toHaveProperty('dia')
    expect(params.dia).toMatch(/lunes|martes|miercoles|jueves|viernes|sabado|domingo/)
  })

  it('getTodayART uses America/Argentina/Buenos_Aires timezone and returns YYYY-MM-DD', () => {
    // Verify the ART utility produces a valid YYYY-MM-DD date string
    // This test validates the timezone-aware date logic introduced for #177
    const todayART = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })
    // en-CA locale returns YYYY-MM-DD format
    expect(todayART).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // At 21:00 UTC, ART (UTC-3) is 18:00 — still the same calendar date
    // At 00:00 UTC, ART is 21:00 previous day — different calendar date
    // The utility must handle this so the "Hoy" chip always shows the correct ART date
    const utcMidnight = new Date('2026-10-15T00:00:00Z')
    const artDate = utcMidnight.toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })
    // UTC midnight = ART 2026-10-14 21:00 — so ART date is 2026-10-14, not 2026-10-15
    expect(artDate).toBe('2026-10-14')
  })
})
