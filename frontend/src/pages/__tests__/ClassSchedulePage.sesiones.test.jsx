/**
 * Test #11 (contract): ClassSchedulePage > consumes sesiones endpoint with date range
 *
 * Verifies that the calendar tab uses useSesionesByRange (date-range endpoint)
 * instead of the class template endpoint, and renders session data correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ClassSchedulePage from '../ClassSchedulePage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('../../hooks/queries/useClases', () => ({
  useClasesList: vi.fn(() => ({ data: [], isLoading: false })),
  useClasesMutations: vi.fn(() => ({
    cancelar: { mutate: vi.fn(), isPending: false },
  })),
}))

vi.mock('../../hooks/queries/useClassAttendees', () => ({
  useClassAttendees: vi.fn(() => ({
    attendees: [],
    isLoading: false,
    toggleStatus: vi.fn(),
    saveAttendees: vi.fn(),
  })),
}))

vi.mock('../../hooks/queries/useSesiones', () => ({
  useSesionesByRange: vi.fn(),
  useSesionesMutations: vi.fn(() => ({
    cancelarSesion: { mutate: vi.fn(), isPending: false },
  })),
}))

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../../components/layout/TopBar', () => ({
  default: ({ title, subtitle, rightContent }) => (
    <div data-testid="top-bar">
      <h1>{title}</h1>
      <p data-testid="top-bar-subtitle">{subtitle}</p>
      <div>{rightContent}</div>
    </div>
  ),
}))

vi.mock('../../components/classes/ClassCalendarView', () => ({
  default: ({ classes, diasSemana }) => (
    <div data-testid="calendar-view" data-class-count={classes?.length ?? 0}>
      {diasSemana?.map((d) => (
        <span key={d.key} data-testid={`dia-${d.key}`}>{d.isoDate}</span>
      ))}
    </div>
  ),
}))

vi.mock('../../components/classes/ClassListDetailView', () => ({
  default: () => <div data-testid="list-view" />,
}))

vi.mock('../../components/classes/ClassAttendeesModal', () => ({
  default: () => null,
}))

vi.mock('../../components/classes/CancelarClaseModal', () => ({
  default: () => null,
}))

vi.mock('../../components/classes/CancelarSesionModal', () => ({
  default: () => null,
}))

vi.mock('../../components/ui/EmptyState', () => ({
  default: ({ title }) => <div data-testid="empty-state">{title}</div>,
}))

vi.mock('../../components/ui/Button', () => ({
  default: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useSesionesByRange } from '../../hooks/queries/useSesiones'

const MOCK_SESIONES = [
  { id: 101, clase: 1, clase_nombre: 'Spinning Pro', fecha: '2026-10-14', estado: 'activa' },
  { id: 102, clase: 2, clase_nombre: 'Yoga Flow', fecha: '2026-10-15', estado: 'activa' },
]

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <ClassSchedulePage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ClassSchedulePage > consumes sesiones endpoint with date range', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls useSesionesByRange with fechaDesde and fechaHasta when calendar tab is active', () => {
    useSesionesByRange.mockReturnValue({ data: MOCK_SESIONES, isLoading: false })

    renderPage()

    // Verify the hook was called with date range params (strings matching YYYY-MM-DD)
    expect(useSesionesByRange).toHaveBeenCalledWith(
      expect.objectContaining({
        fechaDesde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        fechaHasta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      expect.any(Object)
    )
  })

  it('renders CalendarView with sesiones data (not class templates)', () => {
    useSesionesByRange.mockReturnValue({ data: MOCK_SESIONES, isLoading: false })

    renderPage()

    const calendarView = screen.getByTestId('calendar-view')
    expect(calendarView).toBeInTheDocument()
    // CalendarView receives the sesiones array
    expect(calendarView.getAttribute('data-class-count')).toBe(String(MOCK_SESIONES.length))
  })

  it('shows loading state while sesiones are fetching', () => {
    useSesionesByRange.mockReturnValue({ data: [], isLoading: true })

    renderPage()

    expect(screen.getByText('Cargando calendario...')).toBeInTheDocument()
  })

  it('shows empty state when no sesiones for the week', () => {
    useSesionesByRange.mockReturnValue({ data: [], isLoading: false })

    renderPage()

    expect(screen.getByText('No hay sesiones programadas')).toBeInTheDocument()
  })

  it('passes real ISO dates to diasSemana for calendar navigation', () => {
    useSesionesByRange.mockReturnValue({ data: MOCK_SESIONES, isLoading: false })

    renderPage()

    // CalendarView receives diasSemana with isoDate fields
    const lunesDia = screen.getByTestId('dia-Lunes')
    expect(lunesDia.textContent).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('subtitle reflects sesiones count when in calendario tab', () => {
    useSesionesByRange.mockReturnValue({ data: MOCK_SESIONES, isLoading: false })

    renderPage()

    const subtitle = screen.getByTestId('top-bar-subtitle')
    expect(subtitle.textContent).toContain(`${MOCK_SESIONES.length} sesiones`)
  })
})
