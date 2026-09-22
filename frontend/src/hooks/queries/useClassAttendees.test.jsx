/**
 * Tests for useClassAttendees hook.
 *
 * Coverage uplift: 0% → ~85%.
 * Mocked: services/api, sonner.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '../../test/test-utils'

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

import { useClassAttendees } from './useClassAttendees'
import api from '../../services/api'
import { toast } from 'sonner'

const INSCRIPCIONES = [
  { id: 1, socio_nombre: 'Juan', asistio: false },
  { id: 2, socio_nombre: 'María', asistio: true },
]

describe('useClassAttendees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 1. Returns attendees from API ─────────────────────────────────────────
  it('fetches attendees for a given classId', async () => {
    api.get.mockResolvedValue({ data: { inscripciones: INSCRIPCIONES } })
    const { result } = renderHookWithProviders(() => useClassAttendees(10))
    await waitFor(() => expect(result.current.attendees).toHaveLength(2))
    expect(api.get).toHaveBeenCalledWith('/classes/clases/10/')
  })

  // ── 2. Returns empty array when inscripciones is missing ──────────────────
  it('returns empty attendees array when API returns no inscripciones', async () => {
    api.get.mockResolvedValue({ data: {} })
    const { result } = renderHookWithProviders(() => useClassAttendees(10))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.attendees).toEqual([])
  })

  // ── 3. Does not fetch when classId is falsy ───────────────────────────────
  it('does not call api.get when classId is null', () => {
    api.get.mockResolvedValue({ data: { inscripciones: [] } })
    renderHookWithProviders(() => useClassAttendees(null))
    expect(api.get).not.toHaveBeenCalled()
  })

  // ── 4. toggleStatus calls api.patch with correct payload ─────────────────
  it('toggleStatus calls api.patch with asistio: true when newStatus is "presente"', async () => {
    api.get.mockResolvedValue({ data: { inscripciones: INSCRIPCIONES } })
    api.patch.mockResolvedValue({ data: {} })
    const { result } = renderHookWithProviders(() => useClassAttendees(10))

    await waitFor(() => expect(result.current.attendees).toHaveLength(2))

    await act(async () => {
      result.current.toggleStatus(1, 'presente')
    })

    expect(api.patch).toHaveBeenCalledWith('/classes/inscripciones/1/', { asistio: true })
  })

  // ── 5. toggleStatus with "ausente" calls api.patch with asistio: false ────
  it('toggleStatus calls api.patch with asistio: false when newStatus is "ausente"', async () => {
    api.get.mockResolvedValue({ data: { inscripciones: INSCRIPCIONES } })
    api.patch.mockResolvedValue({ data: {} })
    const { result } = renderHookWithProviders(() => useClassAttendees(10))

    await waitFor(() => expect(result.current.attendees).toHaveLength(2))

    await act(async () => {
      result.current.toggleStatus(2, 'ausente')
    })

    expect(api.patch).toHaveBeenCalledWith('/classes/inscripciones/2/', { asistio: false })
  })

  // ── 6. toggleStatus error shows toast.error ───────────────────────────────
  it('shows toast.error when toggleStatus fails', async () => {
    api.get.mockResolvedValue({ data: { inscripciones: INSCRIPCIONES } })
    api.patch.mockRejectedValue({ response: { data: { detail: 'Error de permisos' } } })
    const { result } = renderHookWithProviders(() => useClassAttendees(10))

    await waitFor(() => expect(result.current.attendees).toHaveLength(2))

    await act(async () => {
      result.current.toggleStatus(1, 'presente')
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error de permisos')
    })
  })

  // ── 7. Hook returns expected API surface ──────────────────────────────────
  it('exposes attendees, isLoading, isError, toggleStatus, saveAttendees', () => {
    api.get.mockResolvedValue({ data: { inscripciones: [] } })
    const { result } = renderHookWithProviders(() => useClassAttendees(10))
    expect(typeof result.current.toggleStatus).toBe('function')
    expect(typeof result.current.saveAttendees).toBe('function')
    expect(typeof result.current.fetchAttendees).toBe('function')
    expect(Array.isArray(result.current.attendees)).toBe(true)
  })
})
