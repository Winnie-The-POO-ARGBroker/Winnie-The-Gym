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

  it('no vuelve a llamar onSearch cuando el padre re-renderiza con un callback nuevo', () => {
    const first = vi.fn()
    const { rerender } = render(<SearchBar onSearch={first} />)

    const second = vi.fn()
    rerender(<SearchBar onSearch={second} />)
    rerender(<SearchBar onSearch={vi.fn()} />)

    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
  })

  it('usa el último onSearch al disparar la búsqueda debounceada', () => {
    vi.useFakeTimers()
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<SearchBar delay={300} onSearch={first} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ana' } })
    rerender(<SearchBar delay={300} onSearch={second} />)
    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('Ana')
    vi.useRealTimers()
  })
})
