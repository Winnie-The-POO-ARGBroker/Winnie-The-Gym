/**
 * Tests for useClases hooks (useClasesList, useClaseDetail, useClasesMutations).
 *
 * Satisfies REQ-4.2 (≥ 8 tests).
 * Uses renderHookWithProviders from factory.
 * Mocked: services/api, sonner
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, act } from '@testing-library/react'
import { useClasesList, useClaseDetail, useClasesMutations, CLASES_QUERY_KEYS } from './useClases'
import { renderHookWithProviders, createTestQueryClient, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../constants/pagination', () => ({
  ALL_RECORDS_PAGE_SIZE: 200,
}))

import api from '../../services/api'

const mockClases = [
  { id: 1, nombre: 'Spinning Pro', categoria: 'spinning', cupo_maximo: 20 },
  { id: 2, nombre: 'Funcional AM', categoria: 'funcional', cupo_maximo: 15 },
]

describe('useClases hooks', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  // ── 1. useClasesList returns array on success ─────────────────────────────
  it('useClasesList: data is an array of class objects on success', async () => {
    api.get.mockResolvedValueOnce({ data: { results: mockClases } })

    const { result } = renderHookWithProviders(() => useClasesList())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data).toHaveLength(2)
  })

  // ── 2. useClasesList isLoading=true initially ─────────────────────────────
  it('useClasesList: isLoading is true before data arrives', () => {
    api.get.mockReturnValue(new Promise(() => {}))

    const { result } = renderHookWithProviders(() => useClasesList())

    expect(result.current.isLoading).toBe(true)
  })

  // ── 3. useClasesList isError=true on failure ──────────────────────────────
  it('useClasesList: isError is true on API error', async () => {
    // hook has retry: 1, so we need two rejections
    api.get.mockRejectedValue(new Error('Network error'))

    const { result } = renderHookWithProviders(() => useClasesList(), {
      queryClient: createTestQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
  })

  // ── 4. useClaseDetail is disabled when id is falsy ────────────────────────
  it('useClaseDetail: query is disabled when id is null', () => {
    const { result } = renderHookWithProviders(() => useClaseDetail(null))

    // enabled: !!id is false, so query won't fire
    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  // ── 5. useClaseDetail fetches when id is provided ────────────────────────
  it('useClaseDetail: fetches class data when id is provided', async () => {
    api.get.mockResolvedValueOnce({ data: mockClases[0] })

    const { result } = renderHookWithProviders(() => useClaseDetail(1))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockClases[0])
  })

  // ── 6. useClasesMutations: create mutation calls post ─────────────────────
  it('useClasesMutations: create mutation calls api.post', async () => {
    const newClase = { nombre: 'Yoga AM', categoria: 'yoga' }
    api.post.mockResolvedValueOnce({ data: { id: 10, ...newClase } })

    const { result } = renderHookWithProviders(() => useClasesMutations())

    await act(async () => {
      await result.current.create.mutateAsync(newClase)
    })

    expect(api.post).toHaveBeenCalledWith('/classes/clases/', newClase)
  })

  // ── 7. useClasesMutations: create invalidates query cache ─────────────────
  it('useClasesMutations: create mutation invalidates the clases query cache', async () => {
    const qc = createTestQueryClient()
    // Pre-seed cache with old data
    qc.setQueryData(CLASES_QUERY_KEYS.all, { old: true })

    api.post.mockResolvedValueOnce({ data: { id: 10, nombre: 'New Class' } })

    const { result } = renderHookWithProviders(() => useClasesMutations(), { queryClient: qc })

    await act(async () => {
      await result.current.create.mutateAsync({ nombre: 'New Class', categoria: 'yoga' })
    })

    // After invalidation, the stale key should be invalidated
    const queryState = qc.getQueryState(CLASES_QUERY_KEYS.all)
    // invalidateQueries marks queries as stale / removed
    expect(queryState?.isInvalidated ?? true).toBe(true)
  })

  // ── 8. useClasesMutations: remove mutation calls api.delete ───────────────
  it('useClasesMutations: remove mutation calls api.delete with class id', async () => {
    api.delete.mockResolvedValueOnce({ data: {} })

    const { result } = renderHookWithProviders(() => useClasesMutations())

    await act(async () => {
      await result.current.remove.mutateAsync(1)
    })

    expect(api.delete).toHaveBeenCalledWith('/classes/clases/1/')
  })

  // ── 9. useClasesMutations: update mutation calls api.put ──────────────────
  it('useClasesMutations: update mutation calls api.put with class id and data', async () => {
    const updatedData = { nombre: 'Spinning PM', categoria: 'spinning' }
    api.put.mockResolvedValueOnce({ data: { id: 1, ...updatedData } })

    const { result } = renderHookWithProviders(() => useClasesMutations())

    await act(async () => {
      await result.current.update.mutateAsync({ id: 1, data: updatedData })
    })

    expect(api.put).toHaveBeenCalledWith('/classes/clases/1/', updatedData)
  })
})
