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
    
    // Simulate open event
    act(() => {
      mockWebSocket.onopen()
    })

    expect(result.current.isConnecting).toBe(false)
    expect(result.current.isConnected).toBe(true)
  })

  it('should refresh token on 4403 rejection', async () => {
    const refreshAuthTokenMock = vi.fn().mockResolvedValue(true)
    useAuthStore.getState.mockReturnValue({
      accessToken: 'fake-token',
      refreshAuthToken: refreshAuthTokenMock,
      clearAuth: vi.fn(),
    })

    const { result } = renderHook(() => useWebSocket('/ws/test/'))

    // Simulate 4403 close event
    await act(async () => {
      await mockWebSocket.onclose({ code: 4403 })
    })

    expect(refreshAuthTokenMock).toHaveBeenCalled()
    
    // It should reconnect, but since we are mocking WebSocket, 
    // it will call the constructor again.
    expect(global.WebSocket).toHaveBeenCalledTimes(2)
  })
})
