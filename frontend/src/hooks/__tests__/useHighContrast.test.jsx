import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useHighContrast } from '../useHighContrast'


describe('useHighContrast', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.classList.remove('high-contrast')
  })


  it('se auto-activa en /socio/credencial', () => {
    const { result } = renderHook(() => useHighContrast(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/socio/credencial']}>{children}</MemoryRouter>
      ),
    })

    expect(result.current.isHighContrast).toBe(true)
    expect(result.current.isAutoActivated).toBe(true)
    expect(document.body.classList.contains('high-contrast')).toBe(true)
  })


  it('NO se auto-activa en otras, e.g. /socio/clases', () => {
    const { result } = renderHook(() => useHighContrast(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/socio/clases']}>{children}</MemoryRouter>
      ),
    })


    expect(result.current.isHighContrast).toBe(false)
    expect(result.current.isAutoActivated).toBe(false)
    expect(document.body.classList.contains('high-contrast')).toBe(false)
  })


  it('permite alternar manualmente y persiste en localStorage', () => {
    const { result } = renderHook(() => useHighContrast(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/socio/credencial']}>{children}</MemoryRouter>
      ),
    })


    act(() => {
      result.current.toggleHighContrast()
    })

    expect(result.current.isHighContrast).toBe(false)
    expect(localStorage.getItem('winnie-high-contrast-pref')).toBe('false')
    expect(document.body.classList.contains('high-contrast')).toBe(false)
  })
})
