/**
 * Tests for useDashboardData hooks.
 *
 * Coverage uplift: 0% → ~80%.
 * Mocked: services/api, constants/pagination.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

describe('mapAccessLog con el formato real del backend', () => {
  const base = { id: 7, timestamp: '2026-10-18T17:54:10Z', user_nombre: 'Rodrigo', user_apellido: 'Perez', user_plan_nombre: 'Plan test 2' }

  it('convierte ENTRY y EXIT (mayúsculas, como los manda la API) a entry y exit', () => {
    expect(mapAccessLog({ ...base, access_type: 'ENTRY', status: 'GRANTED' }).type).toBe('entry')
    expect(mapAccessLog({ ...base, access_type: 'EXIT', status: 'GRANTED' }).type).toBe('exit')
  })

  it('un acceso permitido no figura como rechazado', () => {
    const result = mapAccessLog({ ...base, access_type: 'ENTRY', status: 'GRANTED' })
    expect(result.denied).toBe(false)
    expect(result.denialReason).toBeNull()
  })

  it('marca como rechazado un acceso DENIED y trae el motivo legible', () => {
    const result = mapAccessLog({ ...base, access_type: 'ENTRY', status: 'DENIED', denial_reason: 'MEMBERSHIP_INACTIVE' })
    expect(result.denied).toBe(true)
    expect(result.type).toBe('entry')
    expect(result.denialReason).toBe('Membresía inactiva o vencida')
  })

  it('si el motivo no está en el catálogo, muestra el código en vez de nada', () => {
    const result = mapAccessLog({ ...base, access_type: 'EXIT', status: 'DENIED', denial_reason: 'MOTIVO_NUEVO' })
    expect(result.denialReason).toBe('MOTIVO_NUEVO')
  })

  it('un rechazo sin motivo informado igual queda marcado', () => {
    const result = mapAccessLog({ ...base, access_type: 'ENTRY', status: 'DENIED', denial_reason: null })
    expect(result.denied).toBe(true)
    expect(result.denialReason).toBeNull()
  })
})

describe('mapAccessLog dayLabel', () => {
  const NOW = new Date(2026, 9, 27, 0, 30, 0) // 27/10/2026 00:30 local
  const log = (date) => ({ id: 1, timestamp: date?.toISOString?.() ?? date, access_type: 'ENTRY', status: 'GRANTED' })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('labels a movement from today as "Hoy"', () => {
    expect(mapAccessLog(log(new Date(2026, 9, 27, 0, 5))).dayLabel).toBe('Hoy')
  })

  it('labels the previous calendar day as "Ayer" even when it is less than 24h ago', () => {
    expect(mapAccessLog(log(new Date(2026, 9, 26, 23, 50))).dayLabel).toBe('Ayer')
  })

  it('labels older movements as dd/mm', () => {
    expect(mapAccessLog(log(new Date(2026, 9, 20, 22, 8))).dayLabel).toBe('20/10')
    expect(mapAccessLog(log(new Date(2026, 8, 5, 9, 0))).dayLabel).toBe('05/09')
  })

  it('keeps the time field', () => {
    expect(mapAccessLog(log(new Date(2026, 9, 27, 0, 5))).time).toEqual(expect.any(String))
  })

  it('does not throw and returns an empty dayLabel for invalid or missing timestamps', () => {
    expect(mapAccessLog(log('not-a-date')).dayLabel).toBe('')
    expect(mapAccessLog({ id: 2 }).dayLabel).toBe('')
    expect(mapAccessLog({ id: 3, timestamp: null }).dayLabel).toBe('')
  })
})

describe('useAccessLogs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks the API for exactly `limit` rows via page_size (the backend ignores `limit`)', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    const { result } = renderHookWithProviders(() => useAccessLogs(10))
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.get).toHaveBeenCalledWith('/access/logs/', {
      params: expect.objectContaining({ page_size: 10 }),
    })
  })

  it('an explicit page_size wins over the one derived from limit', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    const { result } = renderHookWithProviders(() => useAccessLogs(5, 20))
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.get).toHaveBeenCalledWith('/access/logs/', {
      params: expect.objectContaining({ page_size: 20 }),
    })
  })

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

  it('asks only for the latest vencida membership of each socio', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    const { result } = renderHookWithProviders(() => useDashboardAlerts())
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.get).toHaveBeenCalledWith('/memberships/membresias/', {
      params: expect.objectContaining({ estado: 'vencida', ultima: true, limit: 5 }),
    })
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
