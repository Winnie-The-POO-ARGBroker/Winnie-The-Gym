/**
 * #353 — aria-sort is only valid on columnheader elements (WCAG 4.1.2).
 * The sort action must live on a native <button> inside the <th>.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import DataTable from './DataTable'

vi.mock('../../hooks/useMediaQuery', () => ({ default: () => false }))

const columns = [
  { key: 'nombre', label: 'Nombre', sortable: true },
  { key: 'apellido', label: 'Apellido', sortable: false },
]
const data = [{ id: 1, nombre: 'Ana', apellido: 'García' }]

describe('DataTable sortable headers (#353)', () => {
  it('puts aria-sort on the columnheader, not on an interactive role', () => {
    render(<DataTable columns={columns} data={data} onSort={vi.fn()} ordering="nombre" />)

    const header = screen.getByRole('columnheader', { name: /nombre/i })
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(header).not.toHaveAttribute('role')
    expect(header).not.toHaveAttribute('tabindex')
  })

  it('reports descending and none states', () => {
    const { rerender } = render(
      <DataTable columns={columns} data={data} onSort={vi.fn()} ordering="-nombre" />
    )
    expect(screen.getByRole('columnheader', { name: /nombre/i })).toHaveAttribute(
      'aria-sort',
      'descending'
    )

    rerender(<DataTable columns={columns} data={data} onSort={vi.fn()} />)
    expect(screen.getByRole('columnheader', { name: /nombre/i })).toHaveAttribute(
      'aria-sort',
      'none'
    )
  })

  it('does not set aria-sort on non-sortable headers', () => {
    render(<DataTable columns={columns} data={data} onSort={vi.fn()} />)
    expect(screen.getByRole('columnheader', { name: /apellido/i })).not.toHaveAttribute('aria-sort')
  })

  it('triggers sorting from a native button inside the header', () => {
    const onSort = vi.fn()
    render(<DataTable columns={columns} data={data} onSort={onSort} />)

    const header = screen.getByRole('columnheader', { name: /nombre/i })
    const button = within(header).getByRole('button', { name: /nombre/i })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')

    fireEvent.click(button)
    expect(onSort).toHaveBeenCalledWith('nombre')
  })

  it('does not render a button for non-sortable headers', () => {
    render(<DataTable columns={columns} data={data} onSort={vi.fn()} />)
    const header = screen.getByRole('columnheader', { name: /apellido/i })
    expect(within(header).queryByRole('button')).toBeNull()
  })
})
