import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HighContrastToggle from '../HighContrastToggle'


describe('HighContrastToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.classList.remove('high-contrast')
  })


  it('renderiza con atributos de accesibilidad', () => {
    render(
      <MemoryRouter initialEntries={['/socio/credencial']}>
        <HighContrastToggle />
      </MemoryRouter>
    )

    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('id', 'high-contrast-toggle')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn).toHaveTextContent(/Alto Contraste/i)
  })


  it('alterna al recibir click', () => {
    render(
      <MemoryRouter initialEntries={['/socio/credencial']}>
        <HighContrastToggle />
      </MemoryRouter>
    )

    const btn = screen.getByRole('button')
    fireEvent.click(btn)

    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(btn).toHaveTextContent(/Normal/i)
  })
})
