/**
 * Tests for useDashboardData hooks.
 *
 * Coverage uplift: 0% → ~80%.
 * Mocked: services/api, constants/pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '../../test/test-utils'

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}))

vi.mock('../../constants/pagination', () => ({
  ALL_RECORDS_PAGE_SIZE: 200,
}))

import {
  useAccessLogs,
  useDashboardAlerts,
  useDashboardClasses,
  useSocioMembership,
  useSocioUpcomingClasses,
  useAforoStats,
  mapAccessLog,
} from './useDashboardData'
import api from '../../services/api'

describe('mapAccessLog', () => {
  it('maps log with full name', () => {
    const log = {
      id: 1,
      timestamp: '2026-09-21T10:30:00Z',
      user_nombre: 'Juan',
      user_apellido: 'Pérez',
      user_plan_nombre: 'Premium',
      access_type: 'entry',
    }
    const result = mapAccessLog(log)
    expect(result.name).toBe('Juan Pérez')
    expect(result.membership).toBe('Premium')
    expect(result.type).toBe('entry')
  })

  it('maps log with no nombre as "Desconocido"', () => {
    const log = {
      id: 2,
      timestamp: '2026-09-21T11:00:00Z',
      user_nombre: null,
      user_apellido: null,
      user_plan_nombre: null,
      access_type: 'exit',
    }
    const result = mapAccessLog(log)
    expect(result.name).toBe('Desconocido')
    expect(result.membership).toBe('Sin plan')
  })
})

describe('useAccessLogs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches access logs from API', async () => {
    const LOGS = [{ id: 1, timestamp: '2026-09-21T10:00:00Z', user_nombre: 'A', user_apellido: 'B', user_plan_nombre: 'Plan', access_type: 'entry' }]
    api.get.mockResolvedValue({ data: { results: LOGS } })
    const { result } = renderHookWithProviders(() => useAccessLogs())
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.get).toHaveBeenCalledWith('/access/logs/', expect.any(Object))
  })
})

describe('useDashboardAlerts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches dashboard alerts from API', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    const { result } = renderHookWithProviders(() => useDashboardAlerts())
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.get).toHaveBeenCalledWith('/memberships/membresias/', expect.any(Object))
  })
})

describe('useDashboardClasses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches dashboard classes from API', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    const { result } = renderHookWithProviders(() => useDashboardClasses())
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.get).toHaveBeenCalledWith('/classes/clases/', expect.any(Object))
  })
})

describe('useSocioMembership', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches socio membership from /memberships/me/', async () => {
    api.get.mockResolvedValue({ data: { estado: 'activa' } })
    const { result } = renderHookWithProviders(() => useSocioMembership())
    await waitFor(() => expect(result.current.data).toEqual({ estado: 'activa' }))
    expect(api.get).toHaveBeenCalledWith('/memberships/me/')
  })
})

describe('useSocioUpcomingClasses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns only user_inscrito classes, max 3', async () => {
    const ALL = [
      { id: 1, user_inscrito: true },
      { id: 2, user_inscrito: false },
      { id: 3, user_inscrito: true },
      { id: 4, user_inscrito: true },
      { id: 5, user_inscrito: true },
    ]
    api.get.mockResolvedValue({ data: { results: ALL } })
    const { result } = renderHookWithProviders(() => useSocioUpcomingClasses())
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data.length).toBe(3)
    expect(result.current.data.every((c) => c.user_inscrito)).toBe(true)
  })
})

describe('useAforoStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches aforo stats from /access/stats/', async () => {
    api.get.mockResolvedValue({ data: { current: 12, max: 50 } })
    const { result } = renderHookWithProviders(() => useAforoStats())
    await waitFor(() => expect(result.current.data).toEqual({ current: 12, max: 50 }))
    expect(api.get).toHaveBeenCalledWith('/access/stats/')
  })
})
