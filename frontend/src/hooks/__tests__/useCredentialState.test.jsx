import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useCredentialState, { parseExpiresAt } from '../useCredentialState'
import api from '../../services/api'

vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const NOW = new Date('2026-10-18T16:40:00Z')

// The backend answers expires_at as UNIX seconds (an integer), not milliseconds.
function qrResponse(ttlSeconds = 30) {
  return { data: { qr_token: 'tok', expires_in: ttlSeconds, expires_at: Math.floor(Date.now() / 1000) + ttlSeconds, jti: 'j' } }
}

// One long act() would hold React's state updates back, so advance second by second.
async function tick(seconds) {
  for (let i = 0; i < seconds; i += 1) {
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  }
}

const qrCalls = () => api.get.mock.calls.filter(([url]) => url === '/access/qr/generate/').length

describe('useCredentialState — countdown with the real backend response', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW })
    vi.clearAllMocks()
    // Like production: the request takes a while to answer.
    api.get.mockImplementation((url) => (url === '/access/qr/generate/'
      ? new Promise((resolve) => setTimeout(() => resolve(qrResponse()), 800))
      : Promise.resolve({ data: {} })))
  })

  afterEach(() => vi.useRealTimers())

  it('arranca el contador en los 30 segundos reales del token y va bajando', async () => {
    const { result } = renderHook(() => useCredentialState({ enabled: true }))
    await tick(1)

    expect(result.current.qrToken).toBe('tok')
    expect(result.current.timeLeft).toBeGreaterThanOrEqual(28)
    expect(result.current.timeLeft).toBeLessThanOrEqual(30)

    await tick(10)
    expect(result.current.timeLeft).toBeLessThanOrEqual(20)
    expect(result.current.timeLeft).toBeGreaterThan(0)
  })

  it('no vuelve a pedir el QR mientras el token sigue vigente', async () => {
    renderHook(() => useCredentialState({ enabled: true }))
    await tick(10)

    expect(qrCalls()).toBe(1)
  })

  it('pide uno nuevo recién cuando el token vence', async () => {
    renderHook(() => useCredentialState({ enabled: true }))
    await tick(33)

    expect(qrCalls()).toBe(2)
  })

  it('también entiende un expires_at en formato ISO', async () => {
    api.get.mockImplementation((url) => Promise.resolve(
      url === '/access/qr/generate/'
        ? { data: { qr_token: 'tok', expires_at: new Date(NOW.getTime() + 30000).toISOString() } }
        : { data: {} },
    ))
    const { result } = renderHook(() => useCredentialState({ enabled: true }))
    await tick(6)

    expect(result.current.timeLeft).toBeLessThanOrEqual(25)
    expect(result.current.timeLeft).toBeGreaterThan(0)
  })

  it('no refresca antes de tiempo: a los 29 s sigue el primer token', async () => {
    renderHook(() => useCredentialState({ enabled: true }))
    await tick(29)

    expect(qrCalls()).toBe(1)
  })

  it('un reloj del dispositivo adelantado no dispara refrescos en cadena (usa expires_in)', async () => {
    // Device clock one minute ahead of the server: expires_at already looks past.
    api.get.mockImplementation((url) => (url === '/access/qr/generate/'
      ? new Promise((resolve) => setTimeout(() => resolve({
        data: { qr_token: 'tok', expires_in: 30, expires_at: Math.floor(Date.now() / 1000) - 30, jti: 'j' },
      }), 800))
      : Promise.resolve({ data: {} })))

    const { result } = renderHook(() => useCredentialState({ enabled: true }))
    await tick(8)

    expect(qrCalls()).toBe(1)
    expect(result.current.timeLeft).toBeGreaterThan(15)
  })

  it('si el refresco falla no martilla la API: queda desactualizado y espera', async () => {
    let calls = 0
    api.get.mockImplementation((url) => {
      if (url !== '/access/qr/generate/') return Promise.resolve({ data: {} })
      calls += 1
      return calls === 1
        ? Promise.resolve(qrResponse())
        : Promise.reject(new Error('offline'))
    })

    const { result } = renderHook(() => useCredentialState({ enabled: true }))
    await tick(90)

    expect(result.current.isStale).toBe(true)
    expect(qrCalls()).toBeLessThanOrEqual(4)
  })
})

describe('parseExpiresAt', () => {
  it('lee segundos UNIX', () => {
    expect(parseExpiresAt(1792341600).toISOString()).toBe('2026-10-18T16:40:00.000Z')
  })

  it('lee milisegundos', () => {
    expect(parseExpiresAt(1792341600000).toISOString()).toBe('2026-10-18T16:40:00.000Z')
  })

  it('lee ISO', () => {
    expect(parseExpiresAt('2026-10-18T16:40:00Z').getTime()).toBe(1792341600000)
  })

  it.each([null, undefined, '', 'basura'])('devuelve null para %s', (value) => {
    expect(parseExpiresAt(value)).toBeNull()
  })
})

