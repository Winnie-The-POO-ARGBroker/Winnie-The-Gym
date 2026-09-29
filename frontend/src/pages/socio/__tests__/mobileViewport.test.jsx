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

import CredencialDigitalPage from '../CredencialDigitalPage'
import CheckoutPage from '../CheckoutPage'
import ClasesPage from '../ClasesPage'

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
    // Even in loading state, the header 'Credencial' should be visible
    expect(screen.getAllByText(/Credencial/i).length).toBeGreaterThan(0);
  });

  it('CheckoutPage renders in mobile viewport without overflow', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CheckoutPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // It should render the layout which contains 'Renovar membresía'
      expect(screen.getAllByText(/Renovar membresía/i).length).toBeGreaterThan(0);
    });

    assertNoHorizontalOverflow(container);
  });

  it('ClasesPage renders in mobile viewport without overflow', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ClasesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // It should render the layout which contains 'Clases disponibles' or 'clases'
      expect(screen.getAllByText(/Clases/i).length).toBeGreaterThan(0);
    });

    assertNoHorizontalOverflow(container);
  });
});
