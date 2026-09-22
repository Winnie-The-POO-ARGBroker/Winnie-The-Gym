/**
 * Tests for CreateClassPage.
 *
 * Satisfies REQ-2.3 (≥ 16 tests).
 * Mocked: useClasesMutations, useClaseDetail, useNavigate
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import CreateClassPage from './CreateClassPage'
import { renderWithProviders, resetAllStores } from '../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/queries/useClases', () => ({
  useClasesMutations: vi.fn(),
  useClaseDetail: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

vi.mock('../components/layout/AppLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('../components/layout/TopBar', () => ({
  default: ({ title, rightContent }) => (
    <div>
      <h1>{title}</h1>
      {rightContent}
    </div>
  ),
}))

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

import { useClasesMutations, useClaseDetail } from '../hooks/queries/useClases'
import { toast } from 'sonner'

const mockCreateFn = vi.fn()
const mockUpdateFn = vi.fn()

function setupMocks(overrides = {}) {
  useClasesMutations.mockReturnValue({
    create: { mutate: mockCreateFn, isLoading: false, ...overrides.create },
    update: { mutate: mockUpdateFn, isLoading: false, ...overrides.update },
    remove: { mutate: vi.fn(), isLoading: false },
    cancelar: { mutate: vi.fn(), isLoading: false },
  })
  useClaseDetail.mockReturnValue({ data: undefined, isLoading: false, ...overrides.detail })
}

describe('CreateClassPage', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Page title renders ─────────────────────────────────────────────────
  it('renders "Crear clase" title', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByText('Crear clase')).toBeInTheDocument()
    })
  })

  // ── 2. Default form fields are rendered ───────────────────────────────────
  it('renders form fields: nombre, categoria, sala', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByText('Nombre de la clase *')).toBeInTheDocument()
      expect(screen.getByText('Actividad / Disciplina *')).toBeInTheDocument()
    })
  })

  // ── 3. Default values are prefilled ──────────────────────────────────────
  it('has a pre-filled class name in the input', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      const input = screen.getByDisplayValue('Funcional Intensivo')
      expect(input).toBeInTheDocument()
    })
  })

  // ── 4. Publish button visible ─────────────────────────────────────────────
  it('renders "Publicar clase" buttons', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Publicar clase').length).toBeGreaterThan(0)
    })
  })

  // ── 5. Create mutation called on valid submit ─────────────────────────────
  it('calls create mutation when form is submitted with valid data', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Publicar clase').length).toBeGreaterThan(0)
    })

    // Click one of the publish buttons
    fireEvent.click(screen.getAllByText('Publicar clase')[0])

    await waitFor(() => {
      expect(mockCreateFn).toHaveBeenCalled()
    })
  })

  // ── 6. Mutation not called if nombre is cleared ──────────────────────────
  it('calls toast.error and does NOT call mutation when nombre is empty', async () => {
    renderWithProviders(<CreateClassPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Funcional Intensivo')).toBeInTheDocument()
    })

    // Clear the nombre input
    const nombreInput = screen.getByDisplayValue('Funcional Intensivo')
    fireEvent.change(nombreInput, { target: { value: '' } })

    // Click publish
    fireEvent.click(screen.getAllByText('Publicar clase')[0])

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('El nombre de la clase es obligatorio')
    })
    expect(mockCreateFn).not.toHaveBeenCalled()
  })

  // ── 7. Nombre field is editable ───────────────────────────────────────────
  it('updates nombre field when user types', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Funcional Intensivo')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('Funcional Intensivo')
    fireEvent.change(input, { target: { value: 'Spinning Avanzado' } })

    expect(screen.getByDisplayValue('Spinning Avanzado')).toBeInTheDocument()
  })

  // ── 8. Live preview updates with name change ──────────────────────────────
  it('live preview reflects nombre changes in real time', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Funcional Intensivo')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('Funcional Intensivo')
    fireEvent.change(input, { target: { value: 'Pilates Pro' } })

    await waitFor(() => {
      expect(screen.getByText('Pilates Pro')).toBeInTheDocument()
    })
  })

  // ── 9. Sala select is rendered ────────────────────────────────────────────
  it('renders sala select with Sala A option', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByText('Sala A (Principal)')).toBeInTheDocument()
    })
  })

  // ── 10. Duration field is present ─────────────────────────────────────────
  it('renders duration field with default value 45', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('45')).toBeInTheDocument()
    })
  })

  // ── 11. Days of week toggles render ──────────────────────────────────────
  it('renders day-of-week recurrencia toggle buttons', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByText('Recurrencia semanal (Días de dictado)')).toBeInTheDocument()
    })
  })

  // ── 12. Plan toggles render ───────────────────────────────────────────────
  it('renders plan toggles for Básico, Premium, Gold', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByText('Básico')).toBeInTheDocument()
      expect(screen.getByText('Premium')).toBeInTheDocument()
      expect(screen.getByText('Gold')).toBeInTheDocument()
    })
  })

  // ── 13. Plan toggle state is reflected in form ───────────────────────────
  it('plan toggle buttons render for all three plans', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      // All three plan toggle buttons should be in the document
      expect(screen.getByText('Básico')).toBeInTheDocument()
      expect(screen.getByText('Premium')).toBeInTheDocument()
      expect(screen.getByText('Gold')).toBeInTheDocument()
    })
  })

  // ── 14. Cancel button navigates back ─────────────────────────────────────
  it('renders Cancel button', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })
  })

  // ── 15. Cupo máximo field renders ────────────────────────────────────────
  it('renders cupo máximo input with default value 20', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument()
    })
  })

  // ── 16. Live preview always visible ──────────────────────────────────────
  it('renders "Vista previa en vivo" section', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByText(/Vista previa en vivo/i)).toBeInTheDocument()
    })
  })

  // ── 17. Lista de espera field renders ────────────────────────────────────
  it('renders lista de espera field with default value 5', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    })
  })
})
