import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ClassSchedulePage from '../ClassSchedulePage'

// Mock React Query hooks used by the page
vi.mock('../../hooks/queries/useClases', () => ({
  useClasesList: vi.fn(() => ({ data: [], isLoading: false })),
  useClasesMutations: vi.fn(() => ({
    create: { mutate: vi.fn(), isPending: false },
    update: { mutate: vi.fn(), isPending: false },
    remove: { mutate: vi.fn(), isPending: false },
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

// Mock heavy layout components
vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))
vi.mock('../../components/layout/TopBar', () => ({
  default: ({ title }) => <div data-testid="top-bar">{title}</div>,
}))

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ClassSchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no classes are returned', async () => {
    renderWithProviders(<ClassSchedulePage />)

    await waitFor(() => {
      expect(screen.getByTestId('app-layout')).toBeInTheDocument()
    })
  })

  it('fetches classes through the useClasesList hook', async () => {
    const { useClasesList } = await import('../../hooks/queries/useClases')

    renderWithProviders(<ClassSchedulePage />)

    await waitFor(() => {
      expect(useClasesList).toHaveBeenCalled()
    })
  })
})
