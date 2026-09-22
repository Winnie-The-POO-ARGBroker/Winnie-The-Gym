/**
 * Tests for MembershipExpiredAlert.
 * Coverage uplift: 0% → ~100%.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MembershipExpiredAlert from './MembershipExpiredAlert'

describe('MembershipExpiredAlert', () => {
  it('renders "Membresía Vencida" label', () => {
    render(<MembershipExpiredAlert />)
    expect(screen.getByText('Membresía Vencida')).toBeInTheDocument()
  })

  it('shows expiry date message when fechaVencimiento is provided', () => {
    render(<MembershipExpiredAlert fechaVencimiento="2025-01-31" />)
    expect(screen.getByText(/Tu plan venció el 2025-01-31/i)).toBeInTheDocument()
  })

  it('shows no-plan message when fechaVencimiento is null', () => {
    render(<MembershipExpiredAlert fechaVencimiento={null} />)
    expect(screen.getByText(/No tienes un plan activo/i)).toBeInTheDocument()
  })

  it('shows no-plan message when fechaVencimiento is undefined', () => {
    render(<MembershipExpiredAlert />)
    expect(screen.getByText(/No tienes un plan activo/i)).toBeInTheDocument()
  })
})
