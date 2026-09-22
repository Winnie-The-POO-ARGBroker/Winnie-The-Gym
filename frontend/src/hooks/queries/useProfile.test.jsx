/**
 * Tests for useProfile and useUpdateProfile hooks.
 *
 * Satisfies REQ-4.3 (≥ 4 tests).
 * Uses renderHookWithProviders from factory.
 * Mocked: services/api
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, act } from '@testing-library/react'
import { useProfile, useUpdateProfile, PROFILE_KEY } from './useProfile'
import { renderHookWithProviders, createTestQueryClient, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

import api from '../../services/api'

const mockProfileData = {
  id: 1,
  username: 'juan.perez',
  email: 'juan.perez@winnie.local',
  nombre: 'Juan',
  apellido: 'Pérez',
  rol: 'socio',
}

describe('useProfile hook', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  // ── 1. data.username and data.email defined on success ────────────────────
  it('returns data with username and email on successful fetch', async () => {
    api.get.mockResolvedValueOnce({ data: mockProfileData })

    const { result } = renderHookWithProviders(() => useProfile())

    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(result.current.data?.username).toBeDefined()
    expect(result.current.data?.email).toBeDefined()
    expect(result.current.data?.email).toBe('juan.perez@winnie.local')
  })

  // ── 2. isLoading=true while pending ───────────────────────────────────────
  it('isPending is true while query is in flight', () => {
    api.get.mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHookWithProviders(() => useProfile())

    expect(result.current.isPending).toBe(true)
  })

  // ── 3. isError=true on 401 response ──────────────────────────────────────
  it('isError is true when API returns an error', async () => {
    const error = { response: { status: 401, data: { detail: 'Unauthorized' } } }
    api.get.mockRejectedValueOnce(error)

    const { result } = renderHookWithProviders(() => useProfile(), {
      queryClient: createTestQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  // ── 4. useUpdateProfile calls api.patch ───────────────────────────────────
  it('useUpdateProfile calls api.patch with correct payload', async () => {
    const updatedData = { ...mockProfileData, nombre: 'Juan Actualizado' }
    api.patch.mockResolvedValueOnce({ data: updatedData })

    const { result } = renderHookWithProviders(() => useUpdateProfile())

    await act(async () => {
      await result.current.mutateAsync({ nombre: 'Juan Actualizado' })
    })

    expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { nombre: 'Juan Actualizado' })
  })

  // ── 5. Returns correct query key constant ─────────────────────────────────
  it('PROFILE_KEY is an array starting with "profile"', () => {
    expect(Array.isArray(PROFILE_KEY)).toBe(true)
    expect(PROFILE_KEY[0]).toBe('profile')
  })
})
