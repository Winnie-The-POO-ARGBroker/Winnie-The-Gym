/**
 * Tests for RecentEventsPanel.
 * Coverage uplift: 0% → ~100%.
 * Mocked: Card.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RecentEventsPanel from './RecentEventsPanel'

vi.mock('../ui/Card', () => ({
  default: ({ children }) => <div data-testid="card">{children}</div>,
}))

const EVENTS = [
  { id: 1, name: 'Juan Pérez', type: 'in', time: '10:30' },
  { id: 2, name: 'María García', type: 'out', time: '11:00' },
]

describe('RecentEventsPanel', () => {
  it('renders "Actividad Reciente" heading', () => {
    render(<RecentEventsPanel events={EVENTS} />)
    expect(screen.getByText('Actividad Reciente')).toBeInTheDocument()
  })

  it('renders each event name', () => {
    render(<RecentEventsPanel events={EVENTS} />)
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('María García')).toBeInTheDocument()
  })

  it('shows "Entrada" for type "in" events', () => {
    render(<RecentEventsPanel events={EVENTS} />)
    expect(screen.getByText('Entrada')).toBeInTheDocument()
  })

  it('shows "Salida" for type "out" events', () => {
    render(<RecentEventsPanel events={EVENTS} />)
    expect(screen.getByText('Salida')).toBeInTheDocument()
  })

  it('shows event timestamps', () => {
    render(<RecentEventsPanel events={EVENTS} />)
    expect(screen.getByText('10:30')).toBeInTheDocument()
    expect(screen.getByText('11:00')).toBeInTheDocument()
  })

  it('renders empty list without crashing', () => {
    expect(() => render(<RecentEventsPanel events={[]} />)).not.toThrow()
  })
})
