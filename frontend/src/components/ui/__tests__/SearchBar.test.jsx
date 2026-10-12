import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SearchBar from '../SearchBar'

describe('SearchBar component', () => {
  it('renderiza con placeholder por defecto e input vacío', () => {
    render(<SearchBar onSearch={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: /buscar\.\.\./i })
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('')
    expect(screen.queryByRole('button', { name: /limpiar búsqueda/i })).not.toBeInTheDocument()
  })

  it('permite escribir y muestra el botón para limpiar', () => {
    render(<SearchBar placeholder="Buscar socios..." onSearch={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: /buscar socios\.\.\./i })

    fireEvent.change(input, { target: { value: 'Juan' } })
    expect(input.value).toBe('Juan')

    const clearBtn = screen.getByRole('button', { name: /limpiar búsqueda/i })
    expect(clearBtn).toBeInTheDocument()

    fireEvent.click(clearBtn)
    expect(input.value).toBe('')
    expect(screen.queryByRole('button', { name: /limpiar búsqueda/i })).not.toBeInTheDocument()
  })

  it('ejecuta el callback onSearch con debounce tras tipear', () => {
    vi.useFakeTimers()
    const onSearch = vi.fn()
    render(<SearchBar delay={300} onSearch={onSearch} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Fitness' } })

    // No se llama inmediatamente debido al debounce
    expect(onSearch).not.toHaveBeenCalled()

    // Avanzamos el temporizador
    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(onSearch).toHaveBeenCalledWith('Fitness')
    vi.useRealTimers()
  })
})
