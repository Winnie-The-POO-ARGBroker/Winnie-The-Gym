import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../Modal'

describe('Modal component', () => {
  it('no renderiza nada si isOpen es falso', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>Contenido</div>
      </Modal>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza título, descripción, icono y contenido cuando está abierto', () => {
    const onClose = vi.fn()
    render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Título de Prueba"
        description="Descripción de Prueba"
        icon={<span data-testid="icon">Icon</span>}
      >
        <button>Acción interna</button>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Título de Prueba')).toBeInTheDocument()
    expect(screen.getByText('Descripción de Prueba')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acción interna' })).toBeInTheDocument()

    // Botón de cerrar
    const closeBtn = screen.getByRole('button', { name: /cerrar modal/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra el modal al presionar la tecla Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="Modal Escape">
        <p>Cuerpo</p>
      </Modal>
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    // Otras teclas no llaman onClose
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra el modal al hacer click en el backdrop oscuro', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Backdrop Click">
        <p>Cuerpo</p>
      </Modal>
    )

    const backdrop = container.firstChild
    // Click directo en el contenedor exterior cierra
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)

    // Click dentro del contenido no cierra
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
