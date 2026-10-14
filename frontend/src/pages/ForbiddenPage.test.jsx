/**
 * Tests for ForbiddenPage (403 page).
 */

import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import ForbiddenPage from './ForbiddenPage'

describe('ForbiddenPage', () => {
  it('renders 403 status code', () => {
    renderWithProviders(<ForbiddenPage />)
    expect(screen.getByText('403')).toBeInTheDocument()
  })

  it('renders "Sin permisos" message', () => {
    renderWithProviders(<ForbiddenPage />)
    expect(screen.getByText('Sin permisos')).toBeInTheDocument()
  })

  it('renders "Volver" button', () => {
    renderWithProviders(<ForbiddenPage />)
    expect(screen.getByText('Volver')).toBeInTheDocument()
  })
})
