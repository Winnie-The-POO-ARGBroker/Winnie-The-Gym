/**
 * Tests for ErrorBoundary component.
 *
 * ErrorBoundary uses getDerivedStateFromError which requires a class component.
 * We simulate render errors by rendering a component that throws.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import ErrorBoundary from './ErrorBoundary'

// Suppress expected console.error from React when a child throws
let consoleErrorSpy

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

function BrokenComponent() {
  throw new Error('Test render error')
}

function WorkingComponent() {
  return <div data-testid="working">All good</div>
}

describe('ErrorBoundary', () => {
  it('catches error and renders InternalErrorPage', () => {
    renderWithProviders(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByText('Recargar')).toBeInTheDocument()
  })

  it('"Recargar" button calls location.reload()', () => {
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
    })

    renderWithProviders(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    )

    fireEvent.click(screen.getByText('Recargar'))
    expect(reloadSpy).toHaveBeenCalled()
  })

  it('renders children normally when there is no error', () => {
    renderWithProviders(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('working')).toBeInTheDocument()
    expect(screen.queryByText('Algo salió mal')).not.toBeInTheDocument()
  })
})
