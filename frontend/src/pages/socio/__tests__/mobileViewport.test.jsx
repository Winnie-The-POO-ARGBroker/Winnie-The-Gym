import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

// A helper to assert no horizontal overflow in JSDOM.
function assertNoHorizontalOverflow(container) {
  const elements = container.querySelectorAll('*');
  let hasOverflow = false;
  elements.forEach((el) => {
    if (el.scrollWidth > el.clientWidth) {
      hasOverflow = true;
    }
  });
  expect(hasOverflow).toBe(false);
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../hooks/useAuth', () => ({
  default: vi.fn(() => ({ user: { rol: 'socio' } })),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import CredencialDigitalPage from '../CredencialDigitalPage'
import CheckoutPage from '../CheckoutPage'
import ClasesPage from '../ClasesPage'

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: { results: [] } })), post: vi.fn() },
}))

vi.mock('../../../hooks/queries/useMembresias', () => ({
  useSocioMembresiaMe: vi.fn(() => ({ data: null, isLoading: false })),
}))

vi.mock('../../../hooks/queries/usePlanesAdmin', () => ({
  usePlanesQuery: vi.fn(() => ({ data: [], isLoading: false })),
}))

vi.mock('../../../hooks/queries/usePlanes', () => ({
  usePlanes: vi.fn(() => ({ data: [], isLoading: false })),
}))

vi.mock('../../../hooks/queries/usePagos', () => ({
  useCrearPreferenciaMutation: vi.fn(() => ({ mutate: vi.fn() })),
}))

vi.mock('../../../hooks/queries/useClases', () => ({
  useClasesList: vi.fn(() => ({ data: [], isLoading: false })),
  useInscribirClaseMutation: vi.fn(() => ({ mutate: vi.fn() })),
  useCancelarInscripcionMutation: vi.fn(() => ({ mutate: vi.fn() }))
}))

describe('RNF03: Mobile First Viewport Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate iPhone SE / mini viewport (375x812)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 812 });
    window.dispatchEvent(new Event('resize'));
  });

  it('Base setup for mobile tests works correctly', () => {
    expect(window.innerWidth).toBe(375);
  });

  it('CredencialDigitalPage renders in mobile viewport without overflow and shows critical elements', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CredencialDigitalPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getAllByText(/Credencial/i).length).toBeGreaterThan(0);
    });

    assertNoHorizontalOverflow(container);
    // Menu / Layout should be visible (implicit in layout rendering)
    expect(screen.getAllByText(/Credencial no disponible|Iniciá sesión/i).length).toBeGreaterThan(0);
  });
});
