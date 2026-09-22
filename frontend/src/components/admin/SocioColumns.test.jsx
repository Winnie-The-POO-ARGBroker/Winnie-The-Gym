/**
 * Tests for getSocioColumns.
 * Coverage uplift: 0% → ~90%.
 * Tests the column definitions and render functions directly.
 * Mocked: Avatar, Badge.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { getSocioColumns } from './SocioColumns'

vi.mock('../ui/Avatar', () => ({
  default: ({ name }) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('../ui/Badge', () => ({
  default: ({ children, variant }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}))

describe('getSocioColumns', () => {
  it('returns an array of column definitions', () => {
    const cols = getSocioColumns()
    expect(Array.isArray(cols)).toBe(true)
    expect(cols.length).toBe(6) // nombre, dni, telefono, estado, certificado, created_at
  })

  it('renders nombre column with full name', () => {
    const cols = getSocioColumns()
    const nombreCol = cols.find((c) => c.key === 'nombre')
    const row = { nombre: 'Juan', apellido: 'Pérez', numero_socio: 'S-001' }
    const { container } = render(nombreCol.render(row))
    // nombre and apellido may be in separate text nodes
    expect(container.textContent).toContain('Juan')
    expect(container.textContent).toContain('Pérez')
    expect(screen.getByText(/Nº S-001/)).toBeInTheDocument()
  })

  it('renders DNI column with dash fallback', () => {
    const cols = getSocioColumns()
    const dniCol = cols.find((c) => c.key === 'dni')
    const { rerender } = render(dniCol.render({ dni: '12345678' }))
    expect(screen.getByText('12345678')).toBeInTheDocument()
    rerender(dniCol.render({ dni: null }))
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders estado "activo" as success badge', () => {
    const cols = getSocioColumns()
    const estadoCol = cols.find((c) => c.key === 'estado')
    render(estadoCol.render({ estado: 'activo' }))
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveTextContent('Activo')
    expect(badge).toHaveAttribute('data-variant', 'success')
  })

  it('renders estado "suspendido" as warning badge', () => {
    const cols = getSocioColumns()
    const estadoCol = cols.find((c) => c.key === 'estado')
    render(estadoCol.render({ estado: 'suspendido' }))
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'warning')
  })

  it('renders estado "baja" as danger badge', () => {
    const cols = getSocioColumns()
    const estadoCol = cols.find((c) => c.key === 'estado')
    render(estadoCol.render({ estado: 'baja' }))
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'danger')
  })

  it('renders certificado column with "Al día" link when url exists', () => {
    const cols = getSocioColumns()
    const certCol = cols.find((c) => c.key === 'certificado')
    render(certCol.render({ certificado_medico_url: 'https://cdn/cert.pdf' }))
    expect(screen.getByText('Al día')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://cdn/cert.pdf')
  })

  it('renders certificado column with "Sin certificado" when no url', () => {
    const cols = getSocioColumns()
    const certCol = cols.find((c) => c.key === 'certificado')
    render(certCol.render({ certificado_medico_url: null }))
    expect(screen.getByText('Sin certificado')).toBeInTheDocument()
  })

  it('renders created_at column with formatted date', () => {
    const cols = getSocioColumns()
    const dateCol = cols.find((c) => c.key === 'created_at')
    render(dateCol.render({ created_at: '2026-01-15T00:00:00Z' }))
    // Should render a localized date
    const rendered = screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
    expect(rendered).toBeInTheDocument()
  })

  it('renders created_at column with "—" when no date', () => {
    const cols = getSocioColumns()
    const dateCol = cols.find((c) => c.key === 'created_at')
    render(dateCol.render({ created_at: null }))
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
