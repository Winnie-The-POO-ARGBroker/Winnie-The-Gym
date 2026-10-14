/**
 * Tests for ConnectionBanner component.
 *
 * Simulates online/offline events via window.dispatchEvent.
 * No fake timers — uses act() + real event dispatch.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { screen, act } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import ConnectionBanner from './ConnectionBanner'

// Store original descriptor to restore after tests
const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine')

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value,
  })
}

afterEach(() => {
  // Restore navigator.onLine
  if (originalOnLineDescriptor) {
    Object.defineProperty(navigator, 'onLine', originalOnLineDescriptor)
  }
})

describe('ConnectionBanner', () => {
  it('shows banner when offline', () => {
    setOnline(false)
    renderWithProviders(<ConnectionBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument()
  })

  it('hides when online at mount', () => {
    setOnline(true)
    renderWithProviders(<ConnectionBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows banner when "offline" event fires', () => {
    setOnline(true)
    renderWithProviders(<ConnectionBanner />)

    act(() => {
      setOnline(false)
      window.dispatchEvent(new Event('offline'))
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('hides when back online', () => {
    setOnline(false)
    renderWithProviders(<ConnectionBanner />)

    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
