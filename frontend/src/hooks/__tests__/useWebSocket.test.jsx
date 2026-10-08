import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useWebSocket, { computeBackoffMs } from '../useWebSocket'
import useAuthStore from '../../stores/authStore'

// We will use the real auth store and just populate it

describe('useWebSocket', () => {
  let mockWebSocket
  let originalWebSocket

  beforeEach(() => {
    // Setup WebSocket mock
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      readyState: 1, // OPEN
    }
    
    // Replace global WebSocket with mock constructor
    originalWebSocket = globalThis.WebSocket
    globalThis.WebSocket = vi.fn(function() { return mockWebSocket })
    
    // Populate real auth store
    useAuthStore.setState({
      accessToken: 'fake-token',
      refreshAuthToken: vi.fn().mockResolvedValue(true),
      clearAuth: vi.fn(),
    })
  })

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('should connect successfully (happy path)', async () => {
    const { result } = renderHook(() => useWebSocket('/ws/test/'))

    expect(result.current.isConnecting).toBe(true)
    expect(result.current.isConnected).toBe(false)
    
    await waitFor(() => expect(mockWebSocket.onopen).toBeInstanceOf(Function))
    
    // Simulate open event
    act(() => {
      mockWebSocket.onopen()
    })

    expect(result.current.isConnecting).toBe(false)
    expect(result.current.isConnected).toBe(true)
    expect(result.current.isReconnecting).toBe(false)
  })

  it('should refresh token on 4401 rejection', async () => {
    const refreshAuthTokenMock = vi.fn().mockResolvedValue(true)
    useAuthStore.setState({
      accessToken: 'fake-token',
      refreshAuthToken: refreshAuthTokenMock,
      clearAuth: vi.fn(),
    })

    renderHook(() => useWebSocket('/ws/test/'))

    await waitFor(() => expect(mockWebSocket.onclose).toBeInstanceOf(Function))

    // Simulate 4401 close event
    await act(async () => {
      await mockWebSocket.onclose({ code: 4401 })
    })

    expect(refreshAuthTokenMock).toHaveBeenCalled()
    
    // It should reconnect, but since we are mocking WebSocket, 
    // it will call the constructor again.
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(2)
  })

  it('should stop retrying on 4403 rejection', async () => {
    const refreshAuthTokenMock = vi.fn().mockResolvedValue(true)
    useAuthStore.setState({
      accessToken: 'fake-token',
      refreshAuthToken: refreshAuthTokenMock,
      clearAuth: vi.fn(),
    })

    const { result } = renderHook(() => useWebSocket('/ws/test/'))

    await waitFor(() => expect(mockWebSocket.onclose).toBeInstanceOf(Function))

    // Simulate 4403 close event
    await act(async () => {
      await mockWebSocket.onclose({ code: 4403 })
    })

    expect(refreshAuthTokenMock).not.toHaveBeenCalled()
    expect(result.current.error.message).toContain('permisos')
    expect(result.current.isReconnecting).toBe(false)
  })
})

// ── Tests unitarios del scheduler de backoff exponencial ───────────────────────
describe('computeBackoffMs (scheduler de backoff exponencial)', () => {
  it('intento 1 → 1 000 ms (1s)', () => {
    expect(computeBackoffMs(1)).toBe(1000)
  })

  it('intento 2 → 2 000 ms (2s)', () => {
    expect(computeBackoffMs(2)).toBe(2000)
  })

  it('intento 3 → 4 000 ms (4s)', () => {
    expect(computeBackoffMs(3)).toBe(4000)
  })

  it('intento 4 → 8 000 ms (8s)', () => {
    expect(computeBackoffMs(4)).toBe(8000)
  })

  it('intento 5 → 16 000 ms (16s)', () => {
    expect(computeBackoffMs(5)).toBe(16000)
  })

  it('intento 6 → 30 000 ms (cap en 30s)', () => {
    // 2^5 * 1000 = 32000 → capped a 30000
    expect(computeBackoffMs(6)).toBe(30000)
  })

  it('intentos muy grandes nunca superan el cap de 30s', () => {
    expect(computeBackoffMs(20)).toBe(30000)
    expect(computeBackoffMs(100)).toBe(30000)
  })
})

// ── Test de integración: isReconnecting se activa en reconexión con backoff ────
describe('useWebSocket — estado isReconnecting con backoff', () => {
  let mockWebSocket
  let originalWebSocket

  beforeEach(() => {
    vi.useFakeTimers()

    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      readyState: 1,
    }

    originalWebSocket = globalThis.WebSocket
    globalThis.WebSocket = vi.fn(function() { return mockWebSocket })

    useAuthStore.setState({
      accessToken: 'fake-token',
      refreshAuthToken: vi.fn().mockResolvedValue(true),
      clearAuth: vi.fn(),
    })
  })

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('activa isReconnecting tras cierre inesperado y programa reconexión con backoff 1s', async () => {
    const { result } = renderHook(() => useWebSocket('/ws/test/'))

    // Esperar a que el hook registre onclose
    await waitFor(() => expect(mockWebSocket.onclose).toBeInstanceOf(Function))

    // Simular cierre inesperado (código normal, no 4401/4403)
    act(() => {
      mockWebSocket.onclose({ code: 1006 })
    })

    // isReconnecting debe activarse
    expect(result.current.isReconnecting).toBe(true)
    expect(result.current.isConnected).toBe(false)

    // Avanzar el timer 1s → debe reconectar (intento 1 = 1000ms)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // WebSocket debería haberse instanciado 2 veces (conexión inicial + reconexión)
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(2)
  })

  it('resetea isReconnecting a false cuando la reconexión es exitosa', async () => {
    const { result } = renderHook(() => useWebSocket('/ws/test/'))

    await waitFor(() => expect(mockWebSocket.onclose).toBeInstanceOf(Function))

    // Simular desconexión
    act(() => {
      mockWebSocket.onclose({ code: 1006 })
    })

    expect(result.current.isReconnecting).toBe(true)

    // Avanzar timer para que intente reconectar
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await waitFor(() => expect(mockWebSocket.onopen).toBeInstanceOf(Function))

    // Simular reconexión exitosa
    act(() => {
      mockWebSocket.onopen()
    })

    expect(result.current.isConnected).toBe(true)
    expect(result.current.isReconnecting).toBe(false)
  })
})
