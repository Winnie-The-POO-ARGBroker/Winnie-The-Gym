/**
 * Tests for InternalErrorPage (500 page).
 */

import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import InternalErrorPage from './InternalErrorPage'

describe('InternalErrorPage', () => {
  it('renders 500 status code and heading', () => {
    renderWithProviders(<InternalErrorPage />)
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
  })

  it('renders "Recargar" and "Volver al inicio" buttons', () => {
    renderWithProviders(<InternalErrorPage />)
    expect(screen.getByText('Recargar')).toBeInTheDocument()
    expect(screen.getByText('Volver al inicio')).toBeInTheDocument()
  })

  it('"Recargar" button calls window.location.reload()', () => {
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
    })

    renderWithProviders(<InternalErrorPage />)
    fireEvent.click(screen.getByText('Recargar'))
    expect(reloadSpy).toHaveBeenCalled()
  })
})
