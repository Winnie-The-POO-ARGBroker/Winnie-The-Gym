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
});
