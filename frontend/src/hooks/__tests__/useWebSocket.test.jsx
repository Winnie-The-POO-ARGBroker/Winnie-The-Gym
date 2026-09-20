import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useWebSocket from '../useWebSocket'
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
  })
})
