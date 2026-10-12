import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useScreenWakeLock from '../useScreenWakeLock'

describe('useScreenWakeLock', () => {
  let mockSentinel
  let originalNavigator
  let originalScreen

  beforeEach(() => {
    mockSentinel = {
      released: false,
      release: vi.fn().mockImplementation(() => {
        mockSentinel.released = true
        return Promise.resolve()
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    originalNavigator = globalThis.navigator
    originalScreen = globalThis.screen

    // Mock Wake Lock API
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        wakeLock: {
          request: vi.fn().mockResolvedValue(mockSentinel),
        },
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'screen', {
      value: originalScreen,
      writable: true,
      configurable: true,
    })
    vi.clearAllMocks()
  })

  it('detects isSupported as true when wakeLock is available in navigator', async () => {
    let hookResult
    await act(async () => {
      hookResult = renderHook(() => useScreenWakeLock())
      await Promise.resolve()
    })
    expect(hookResult.result.current.isSupported).toBe(true)
  })

  it('detects isSupported as false when wakeLock is not present', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    })
    let hookResult
    await act(async () => {
      hookResult = renderHook(() => useScreenWakeLock())
      await Promise.resolve()
    })
    expect(hookResult.result.current.isSupported).toBe(false)
    expect(hookResult.result.current.isActive).toBe(false)
  })

  it('requests screen wake lock on mount and sets isActive to true', async () => {
    const { result } = renderHook(() => useScreenWakeLock())

    await act(async () => {
      // Allow promises to resolve
      await Promise.resolve()
    })

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen')
    expect(result.current.isActive).toBe(true)
  })

  it('releases wake lock on unmount', async () => {
    const { result, unmount } = renderHook(() => useScreenWakeLock())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.isActive).toBe(true)

    act(() => {
      unmount()
    })

    expect(mockSentinel.release).toHaveBeenCalled()
  })

  it('re-requests wake lock on visibilitychange when visible and enabled', async () => {
    renderHook(() => useScreenWakeLock())

    await act(async () => {
      await Promise.resolve()
    })
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1)

    // Simulate release due to screen dim/hide
    mockSentinel.released = true

    // Simulate visibilitychange event
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })

    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2)
  })

  it('boosts and restores brightness if screen.brightness is supported', async () => {
    Object.defineProperty(globalThis, 'screen', {
      value: {
        brightness: 0.5,
      },
      writable: true,
      configurable: true,
    })

    const { result, unmount } = renderHook(() => useScreenWakeLock())

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.brightness).toBe(1.0)
    expect(result.current.brightnessBoosted).toBe(true)

    act(() => {
      unmount()
    })

    expect(screen.brightness).toBe(0.5)
  })

  it('handles screen.setBrightness API if supported', async () => {
    const setBrightnessMock = vi.fn().mockResolvedValue(undefined)
    const getBrightnessMock = vi.fn().mockResolvedValue(0.4)

    Object.defineProperty(globalThis, 'screen', {
      value: {
        setBrightness: setBrightnessMock,
        getBrightness: getBrightnessMock,
      },
      writable: true,
      configurable: true,
    })

    const { result, unmount } = renderHook(() => useScreenWakeLock())

    await act(async () => {
      await Promise.resolve()
    })

    expect(getBrightnessMock).toHaveBeenCalled()
    expect(setBrightnessMock).toHaveBeenCalledWith(1.0)
    expect(result.current.brightnessBoosted).toBe(true)

    act(() => {
      unmount()
    })

    expect(setBrightnessMock).toHaveBeenCalledWith(0.4)
  })
})
