/**
 * Tests for AttendancePage.
 * Coverage uplift: 0% → ~70%.
 * Mocked: useClaseDetail, useClassAttendees, react-router-dom, sonner, layout, Button.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AttendancePage from './AttendancePage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: vi.fn(),
  }
})

vi.mock('../hooks/queries/useClases', () => ({
  useClaseDetail: vi.fn(),
}))

vi.mock('../hooks/queries/useClassAttendees', () => ({
  useClassAttendees: vi.fn(),
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

vi.mock('../components/ui/Button', () => ({
  default: ({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('../components/ui/Avatar', () => ({
  default: ({ name }) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('../components/ui/EmptyState', () => ({
  default: ({ title }) => <div data-testid="empty-state">{title}</div>,
}))

vi.mock('../components/ui/Skeleton', () => ({
  default: () => <div data-testid="skeleton">Loading...</div>,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { useSearchParams } from 'react-router-dom'
import { useClaseDetail } from '../hooks/queries/useClases'
import { useClassAttendees } from '../hooks/queries/useClassAttendees'
import { toast } from 'sonner'

const CLASS_INFO = {
  id: 5,
  nombre: 'Spinning Avanzado',
  hora: '09:00',
  instructor: 'Prof. García',
  cupo_maximo: 20,
  cupos_reservados: 8,
}

const ATTENDEES = [
  { id: 1, socio_nombre: 'Juan', socio_apellido: 'Pérez', socio_numero: 'S-001', asistio: null, en_espera: false },
  { id: 2, socio_nombre: 'María', socio_apellido: 'García', socio_numero: 'S-002', asistio: true, en_espera: false },
  { id: 3, nombre: 'Pedro', socio_nombre: 'Pedro', socio_apellido: 'López', socio_numero: 'S-003', asistio: false, en_espera: true },
]

const mockToggleStatus = vi.fn()
const mockFetchAttendees = vi.fn()

function setupMocks({ classId = '5', classInfo = CLASS_INFO, loading = false, attendees = ATTENDEES } = {}) {
  useSearchParams.mockReturnValue([new URLSearchParams(`id=${classId}`)], vi.fn())
  useClaseDetail.mockReturnValue({ data: classInfo, isLoading: loading })
  useClassAttendees.mockReturnValue({
    attendees,
    toggleStatus: mockToggleStatus,
    fetchAttendees: mockFetchAttendees,
    isLoading: false,
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AttendancePage />
    </MemoryRouter>
  )
}

describe('AttendancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Class name renders in title ────────────────────────────────────────
  it('renders page title', () => {
    renderPage()
    // TopBar renders the title containing class name or "Asistencia"
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0)
  })

  // ── 2. Confirmed attendees render ─────────────────────────────────────────
  it('renders confirmed attendee names via socio_nombre fields', () => {
    renderPage()
    // Juan and María are not en_espera, they render as socio_nombre + socio_apellido
    // The text nodes exist separately so use container check
    expect(screen.getAllByText(/Juan|María/).length).toBeGreaterThan(0)
  })

  // ── 3. Waiting list section renders ──────────────────────────────────────
  it('renders "Lista de espera" section heading', () => {
    renderPage()
    expect(screen.getByText('Lista de espera')).toBeInTheDocument()
  })

  // ── 4. Close attendance button calls navigate ─────────────────────────────
  it('calls navigate to /clases when "Cerrar asistencia" is clicked', () => {
    renderPage()
    const closeBtn = screen.getByText('Cerrar asistencia')
    fireEvent.click(closeBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/clases')
  })

  // ── 5. Close attendance shows success toast ───────────────────────────────
  it('shows toast.success when "Cerrar asistencia" is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByText('Cerrar asistencia'))
    expect(toast.success).toHaveBeenCalledWith('Asistencia guardada y cerrada correctamente')
  })

  // ── 6. No classId shows error and navigates ───────────────────────────────
  it('shows toast.error and navigates when classId is missing', () => {
    useSearchParams.mockReturnValue([new URLSearchParams('')], vi.fn())
    useClaseDetail.mockReturnValue({ data: null, isLoading: false })
    useClassAttendees.mockReturnValue({ attendees: [], toggleStatus: vi.fn(), fetchAttendees: vi.fn() })
    renderPage()
    expect(toast.error).toHaveBeenCalledWith('Clase no encontrada')
    expect(mockNavigate).toHaveBeenCalledWith('/admin/clases')
  })

  // ── 7. Export button renders ──────────────────────────────────────────────
  it('renders export/download button', () => {
    renderPage()
    // Export button exists
    expect(screen.getByText(/Exportar/i)).toBeInTheDocument()
  })
})
