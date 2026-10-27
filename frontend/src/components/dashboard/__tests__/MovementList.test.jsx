import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MovementList from '../MovementList'

const base = { name: 'Rodrigo Perez', membership: 'Plan test 2', time: '02:54 p.m.' }

describe('MovementList', () => {
  it('dibuja la flecha de entrada para una entrada', () => {
    render(<MovementList movements={[{ ...base, id: 1, type: 'entry', denied: false }]} />)

    expect(screen.getByTestId('movement-entry')).toBeInTheDocument()
    expect(screen.queryByTestId('movement-exit')).not.toBeInTheDocument()
  })

  it('dibuja la flecha de salida para una salida', () => {
    render(<MovementList movements={[{ ...base, id: 2, type: 'exit', denied: false }]} />)

    expect(screen.getByTestId('movement-exit')).toBeInTheDocument()
    expect(screen.queryByTestId('movement-entry')).not.toBeInTheDocument()
  })

  it('una entrada y una salida seguidas se ven distintas', () => {
    render(<MovementList movements={[
      { ...base, id: 1, type: 'exit', denied: false },
      { ...base, id: 2, type: 'entry', denied: false },
    ]} />)

    expect(screen.getAllByTestId('movement-entry')).toHaveLength(1)
    expect(screen.getAllByTestId('movement-exit')).toHaveLength(1)
  })

  it('un acceso rechazado se marca como tal y muestra el motivo', () => {
    render(<MovementList movements={[
      { ...base, id: 3, type: 'entry', denied: true, denialReason: 'Membresía inactiva o vencida' },
    ]} />)

    expect(screen.getByTestId('movement-denied')).toBeInTheDocument()
    expect(screen.queryByTestId('movement-entry')).not.toBeInTheDocument()
    expect(screen.getByText(/Entrada denegada/i)).toBeInTheDocument()
    expect(screen.getByText(/Membresía inactiva o vencida/)).toBeInTheDocument()
  })

  it('una salida rechazada dice salida denegada', () => {
    render(<MovementList movements={[{ ...base, id: 4, type: 'exit', denied: true, denialReason: null }]} />)

    expect(screen.getByText(/Salida denegada/i)).toBeInTheDocument()
  })

  it('un tipo desconocido no se dibuja como salida', () => {
    render(<MovementList movements={[{ ...base, id: 5, type: '', denied: false }]} />)

    expect(screen.queryByTestId('movement-exit')).not.toBeInTheDocument()
    expect(screen.queryByTestId('movement-entry')).not.toBeInTheDocument()
    expect(screen.getByTestId('movement-unknown')).toBeInTheDocument()
  })

  it('un rechazo de tipo desconocido dice acceso denegado', () => {
    render(<MovementList movements={[{ ...base, id: 6, type: '', denied: true, denialReason: null }]} />)

    expect(screen.getByText(/Acceso denegado/i)).toBeInTheDocument()
  })

  it('muestra el día junto a la hora', () => {
    render(<MovementList movements={[{ ...base, id: 7, type: 'entry', denied: false, dayLabel: 'Ayer' }]} />)

    expect(screen.getByText('Ayer · 02:54 p.m.')).toBeInTheDocument()
  })

  it('muestra la fecha dd/mm para movimientos antiguos', () => {
    render(<MovementList movements={[{ ...base, id: 8, type: 'entry', denied: false, dayLabel: '20/10' }]} />)

    expect(screen.getByText('20/10 · 02:54 p.m.')).toBeInTheDocument()
  })

  it('sin día informado muestra solo la hora', () => {
    render(<MovementList movements={[{ ...base, id: 9, type: 'entry', denied: false }]} />)

    expect(screen.getByText('02:54 p.m.')).toBeInTheDocument()
  })

  it('el motivo del rechazo no se trunca para que pueda leerse completo', () => {
    render(<MovementList movements={[
      { ...base, id: 10, type: 'entry', denied: true, denialReason: 'Membresía inactiva o vencida' },
    ]} />)

    expect(screen.getByText(/Entrada denegada/i).className).not.toMatch(/truncate/)
  })
})
