import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createTestQueryClient } from '../../test/test-utils'
import { QueryClientProvider } from '@tanstack/react-query'
import CredencialDigitalPage from '../CredencialDigitalPage'
import CheckoutPage from '../CheckoutPage'
import ClasesPage from '../ClasesPage'

describe('RNF03: Mobile First Viewport Tests', () => {
  // A helper to verify JSDOM responsive elements instead of physical layout
  function assertResponsiveClasses(container) {
    const htmlString = container.innerHTML;
    // We shouldn't have hardcoded overflow-x: scroll in the main container without responsiveness
    expect(htmlString).not.toMatch(/class="[^"]*overflow-x-scroll[^"]*"/);
  }

  it('CredencialDigitalPage uses responsive utility classes', async () => {
    const testQueryClient = createTestQueryClient();
    const { container } = render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <CredencialDigitalPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getAllByText(/Credencial/i).length).toBeGreaterThan(0);
    });

    assertResponsiveClasses(container);
  });

  it('CheckoutPage uses responsive utility classes', async () => {
    const testQueryClient = createTestQueryClient();
    const { container } = render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <CheckoutPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // It should render the layout which contains 'Renovar membresía'
      expect(screen.getAllByText(/Renovar membresía/i).length).toBeGreaterThan(0);
    });

    assertResponsiveClasses(container);
  });

  it('ClasesPage uses responsive utility classes', async () => {
    const testQueryClient = createTestQueryClient();
    const { container } = render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <ClasesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // It should render the layout which contains 'Clases disponibles' or 'clases'
      expect(screen.getAllByText(/Clases/i).length).toBeGreaterThan(0);
    });

    assertResponsiveClasses(container);
  });
});
