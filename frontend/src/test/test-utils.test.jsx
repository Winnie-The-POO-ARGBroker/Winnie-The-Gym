/**
 * Self-tests for the shared test-utils factory.
 * Verifies factory invariants: fresh QueryClient per render, Zustand reset,
 * and provider presence.
 *
 * Satisfies REQ-1.5 (≥ 3 test cases).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../stores/authStore'
import {
  createTestQueryClient,
  renderWithProviders,
  seedAuthStore,
  resetAllStores,
  makeAuthedUser,
} from './test-utils'

// ─── Helper component: reads QueryClient from context ─────────────────────────
function QueryClientReader() {
  const qc = useQueryClient()
  return <div data-testid="qc-id">{qc ? 'present' : 'missing'}</div>
}

// ─── Helper component: reads auth store ───────────────────────────────────────
function AuthReader() {
  const user = useAuthStore((s) => s.user)
  return <div data-testid="auth-user">{user ? user.email : 'null'}</div>
}

describe('test-utils factory self-tests', () => {
  beforeEach(() => {
    resetAllStores()
  })

  // ── Test A: createTestQueryClient returns a distinct instance each call ──────
  it('createTestQueryClient returns a distinct instance on each call', () => {
    const client1 = createTestQueryClient()
    const client2 = createTestQueryClient()

    expect(client1).not.toBe(client2)
    expect(client1 instanceof Object).toBe(true)
    expect(client2 instanceof Object).toBe(true)
  })

  // ── Test B: renderWithProviders starts with empty cache ───────────────────────
  it('renderWithProviders provides a fresh cache — setQueryData on one instance does not bleed into the next', async () => {
    const key = ['test-isolation-key']
    const value = { secret: 'from-render-one' }

    // First render: seed cache with a value
    const { queryClient: qc1, unmount } = renderWithProviders(<QueryClientReader />)
    qc1.setQueryData(key, value)
    expect(qc1.getQueryData(key)).toEqual(value)
    unmount()

    // Second render: must start with a fresh QueryClient — key must be absent
    const { queryClient: qc2 } = renderWithProviders(<QueryClientReader />)
    expect(qc2.getQueryData(key)).toBeUndefined()
  })

  // ── Test C: resetAllStores resets Zustand auth state ─────────────────────────
  it('resetAllStores resets auth store to initial defaults', async () => {
    // Seed a non-default value
    seedAuthStore({ user: { email: 'test@test.com' }, accessToken: 'tok' })

    // Verify it is set
    expect(useAuthStore.getState().user).not.toBeNull()
    expect(useAuthStore.getState().accessToken).toBe('tok')

    // Reset
    resetAllStores()

    // State must be back to defaults
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
  })

  // ── Test D: renderWithProviders wraps in QueryClientProvider (no throw) ───────
  it('renderWithProviders wraps UI in QueryClientProvider — useQueryClient does not throw', () => {
    expect(() => {
      renderWithProviders(<QueryClientReader />)
    }).not.toThrow()

    expect(screen.getByTestId('qc-id')).toHaveTextContent('present')
  })

  // ── Test E: seedAuthStore + renderWithProviders propagates to component ────────
  it('seedAuthStore sets auth state visible to components rendered via renderWithProviders', () => {
    const user = makeAuthedUser('socio')
    seedAuthStore({ user })

    renderWithProviders(<AuthReader />)
    expect(screen.getByTestId('auth-user')).toHaveTextContent(user.email)
  })
})
