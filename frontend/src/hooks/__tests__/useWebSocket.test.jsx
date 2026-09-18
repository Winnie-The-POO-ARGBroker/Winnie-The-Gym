import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useWebSocket from '../useWebSocket'
import useAuthStore from '../../stores/authStore'

// Mock the auth store
vi.mock('../../stores/authStore', () => ({
  default: {
    getState: vi.fn(),
  },
}))

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
    originalWebSocket = global.WebSocket
    global.WebSocket = vi.fn(() => mockWebSocket)
    
    // Default auth store mock
    useAuthStore.getState.mockReturnValue({
      accessToken: 'fake-token',
      refreshAuthToken: vi.fn().mockResolvedValue(true),
      clearAuth: vi.fn(),
    })
  })

  afterEach(() => {
    global.WebSocket = originalWebSocket
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
    useAuthStore.getState.mockReturnValue({
      accessToken: 'fake-token',
      refreshAuthToken: refreshAuthTokenMock,
      clearAuth: vi.fn(),
    })

    const { result } = renderHook(() => useWebSocket('/ws/test/'))

    await waitFor(() => expect(mockWebSocket.onclose).toBeInstanceOf(Function))

    // Simulate 4401 close event
    await act(async () => {
      await mockWebSocket.onclose({ code: 4401 })
    })

    expect(refreshAuthTokenMock).toHaveBeenCalled()
    
    // It should reconnect, but since we are mocking WebSocket, 
    // it will call the constructor again.
    expect(global.WebSocket).toHaveBeenCalledTimes(2)
  })

  it('should stop retrying on 4403 rejection', async () => {
    const refreshAuthTokenMock = vi.fn().mockResolvedValue(true)
    useAuthStore.getState.mockReturnValue({
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
