/**
 * Keyboard operability of clickable DataTable rows (#348, WCAG 2.1.1).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DataTable from './DataTable'

let mockIsMobile = false
vi.mock('../../hooks/useMediaQuery', () => ({ default: () => mockIsMobile }))

const columns = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'estado', label: 'Estado' },
]
const data = [
  { id: 1, nombre: 'Ana', estado: 'activo' },
  { id: 2, nombre: 'Carlos', estado: 'baja' },
]

describe('DataTable keyboard operability (#348)', () => {
  describe.each([
    ['table rows', false, 'tr'],
    ['mobile cards', true, '[tabindex]'],
  ])('%s', (_name, isMobile) => {
    const setup = (props = {}) => {
      mockIsMobile = isMobile
      const onRowClick = vi.fn()
      render(
        <DataTable
          columns={columns}
          data={data}
          onRowClick={onRowClick}
          mobileMode="cards"
          {...props}
        />
      )
      const row = screen.getByText('Ana').closest(isMobile ? 'div[tabindex]' : 'tr')
      return { onRowClick, row }
    }

    it('is focusable when the row is clickable', () => {
      const { row } = setup()
      expect(row).not.toBeNull()
      expect(row).toHaveAttribute('tabindex', '0')
    })

    it.each(['Enter', ' '])('activates on key %j', (key) => {
      const { row, onRowClick } = setup()
      fireEvent.keyDown(row, { key })
      expect(onRowClick).toHaveBeenCalledWith(data[0])
    })

    it('ignores other keys', () => {
      const { row, onRowClick } = setup()
      fireEvent.keyDown(row, { key: 'a' })
      expect(onRowClick).not.toHaveBeenCalled()
    })

    it('does not hijack keys pressed on nested controls', () => {
      const { onRowClick } = setup({
        renderActions: (row) => <button type="button">Acción {row.id}</button>,
      })
      fireEvent.keyDown(screen.getByRole('button', { name: 'Acción 1' }), { key: 'Enter' })
      expect(onRowClick).not.toHaveBeenCalled()
    })
  })

  it('does not make rows focusable when there is no onRowClick', () => {
    mockIsMobile = false
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText('Ana').closest('tr')).not.toHaveAttribute('tabindex')
  })
})
