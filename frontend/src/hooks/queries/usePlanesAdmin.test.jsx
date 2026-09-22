/**
 * Tests for usePlanesAdmin hooks.
 *
 * Coverage uplift: 0% → ~80%.
 * Mocked: services/api, sonner.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '../../test/test-utils'

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { usePlanesQuery, usePlanesMutations } from './usePlanesAdmin'
import api from '../../services/api'
import { toast } from 'sonner'

const PLANES_MOCK = [
  { id: 1, nombre: 'Básico', precio: '5000', activo: true },
  { id: 2, nombre: 'Premium', precio: '9000', activo: true },
]

describe('usePlanesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 1. Returns planes data ─────────────────────────────────────────────────
  it('returns planes from API', async () => {
    api.get.mockResolvedValue({ data: { results: PLANES_MOCK } })
    const { result } = renderHookWithProviders(() => usePlanesQuery())
    await waitFor(() => expect(result.current.data).toEqual(PLANES_MOCK))
  })

  // ── 2. Returns raw array when results not wrapped ──────────────────────────
  it('returns raw array when API does not wrap in results', async () => {
    api.get.mockResolvedValue({ data: PLANES_MOCK })
    const { result } = renderHookWithProviders(() => usePlanesQuery())
    await waitFor(() => expect(result.current.data).toEqual(PLANES_MOCK))
  })
})

describe('usePlanesMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 3. savePlan creates new plan when no id ────────────────────────────────
  it('savePlan calls api.post for new plan (no id)', async () => {
    api.post.mockResolvedValue({ data: { id: 3, nombre: 'Gold', activo: true } })
    api.get.mockResolvedValue({ data: [] })
    const { result } = renderHookWithProviders(() => usePlanesMutations())

    await act(async () => {
      result.current.savePlan.mutate({ nombre: 'Gold', precio: '12000' })
    })

    expect(api.post).toHaveBeenCalledWith('/memberships/planes/', expect.objectContaining({ nombre: 'Gold', activo: true }))
  })

  // ── 4. savePlan updates existing plan when id present ──────────────────────
  it('savePlan calls api.patch for existing plan (with id)', async () => {
    api.patch.mockResolvedValue({ data: { id: 1, nombre: 'Básico Updated', activo: true } })
    api.get.mockResolvedValue({ data: [] })
    const { result } = renderHookWithProviders(() => usePlanesMutations())

    await act(async () => {
      result.current.savePlan.mutate({ id: 1, nombre: 'Básico Updated', precio: '5500' })
    })

    expect(api.patch).toHaveBeenCalledWith('/memberships/planes/1/', expect.objectContaining({ id: 1 }))
  })

  // ── 5. savePlan success shows toast for new plan ───────────────────────────
  it('savePlan shows "creado" toast on success for new plan', async () => {
    api.post.mockResolvedValue({ data: { id: 3, nombre: 'Gold' } })
    api.get.mockResolvedValue({ data: [] })
    const { result } = renderHookWithProviders(() => usePlanesMutations())

    await act(async () => {
      result.current.savePlan.mutate({ nombre: 'Gold', precio: '12000' })
    })

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('creado'))
  })

  // ── 6. savePlan success shows "actualizado" toast for existing plan ────────
  it('savePlan shows "actualizado" toast on success for update', async () => {
    api.patch.mockResolvedValue({ data: { id: 1, nombre: 'Básico' } })
    api.get.mockResolvedValue({ data: [] })
    const { result } = renderHookWithProviders(() => usePlanesMutations())

    await act(async () => {
      result.current.savePlan.mutate({ id: 1, nombre: 'Básico', precio: '5500' })
    })

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('actualizado'))
  })

  // ── 7. deletePlan calls api.delete ────────────────────────────────────────
  it('deletePlan calls api.delete with correct URL', async () => {
    api.delete.mockResolvedValue({ data: {} })
    api.get.mockResolvedValue({ data: [] })
    const { result } = renderHookWithProviders(() => usePlanesMutations())

    await act(async () => {
      result.current.deletePlan.mutate({ id: 2, nombre: 'Premium' })
    })

    expect(api.delete).toHaveBeenCalledWith('/memberships/planes/2/')
  })

  // ── 8. deletePlan success shows info toast ────────────────────────────────
  it('deletePlan shows toast.info on success', async () => {
    api.delete.mockResolvedValue({ data: {} })
    api.get.mockResolvedValue({ data: [] })
    const { result } = renderHookWithProviders(() => usePlanesMutations())

    await act(async () => {
      result.current.deletePlan.mutate({ id: 2, nombre: 'Premium' })
    })

    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Premium'))
  })

  // ── 9. toggleActive calls api.patch with inverted activo ─────────────────
  it('toggleActive calls api.patch with inverted activo value', async () => {
    api.patch.mockResolvedValue({ data: { id: 1, nombre: 'Básico', activo: false } })
    api.get.mockResolvedValue({ data: [] })
    const { result } = renderHookWithProviders(() => usePlanesMutations())

    await act(async () => {
      result.current.toggleActive.mutate({ id: 1, nombre: 'Básico', activo: true })
    })

    expect(api.patch).toHaveBeenCalledWith('/memberships/planes/1/', { activo: false })
  })
})
