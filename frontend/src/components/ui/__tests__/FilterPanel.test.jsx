import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterPanel from '../FilterPanel'

describe('FilterPanel component', () => {
  it('renderiza botón colapsado inicialmente sin filtros activos', () => {
    const filters = { estado: '', con_certificado: '' }
    render(<FilterPanel filters={filters} onChange={vi.fn()} onClear={vi.fn()} />)

    const toggleBtn = screen.getByRole('button', { name: /filtros/i })
    expect(toggleBtn).toBeInTheDocument()
    expect(screen.queryByText('Estado')).not.toBeInTheDocument()
  })

  it('abre y cierra el panel desplegable al hacer click en el toggle', () => {
    const filters = { estado: '', con_certificado: '' }
    render(<FilterPanel filters={filters} onChange={vi.fn()} onClear={vi.fn()} />)

    const toggleBtn = screen.getByRole('button', { name: /filtros/i })
    fireEvent.click(toggleBtn)

    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Certificado médico')).toBeInTheDocument()

    // Cierra con otro click en toggle
    fireEvent.click(toggleBtn)
    expect(screen.queryByText('Estado')).not.toBeInTheDocument()
  })

  it('cierra el panel al hacer click en el backdrop invisible', () => {
    const filters = { estado: '', con_certificado: '' }
    const { container } = render(<FilterPanel filters={filters} onChange={vi.fn()} onClear={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /filtros/i }))
    expect(screen.getByText('Estado')).toBeInTheDocument()

    const backdrop = container.querySelector('.fixed.inset-0')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop)

    expect(screen.queryByText('Estado')).not.toBeInTheDocument()
  })

  it('llama a onChange con el filtro de estado seleccionado', () => {
    const onChange = vi.fn()
    const filters = { estado: '', con_certificado: '' }
    render(<FilterPanel filters={filters} onChange={onChange} onClear={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /filtros/i }))
    const activoBtn = screen.getByRole('button', { name: 'Activo' })
    fireEvent.click(activoBtn)

    expect(onChange).toHaveBeenCalledWith('estado', 'activo')
  })

  it('llama a onChange con el filtro de certificado médico seleccionado', () => {
    const onChange = vi.fn()
    const filters = { estado: '', con_certificado: '' }
    render(<FilterPanel filters={filters} onChange={onChange} onClear={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /filtros/i }))
    const conCertBtn = screen.getByRole('button', { name: 'Con certificado' })
    fireEvent.click(conCertBtn)

    expect(onChange).toHaveBeenCalledWith('con_certificado', 'true')
  })

  it('muestra badge de conteo y botón Limpiar cuando hay filtros activos', () => {
    const onClear = vi.fn()
    const filters = { estado: 'activo', con_certificado: 'false' }
    render(<FilterPanel filters={filters} onChange={vi.fn()} onClear={onClear} />)

    // Debe mostrar badge de 2 filtros activos en el toggle
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /filtros/i }))
    const clearBtn = screen.getByRole('button', { name: /limpiar filtros/i })
    expect(clearBtn).toBeInTheDocument()

    fireEvent.click(clearBtn)
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
