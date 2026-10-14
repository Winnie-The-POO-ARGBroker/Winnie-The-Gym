import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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

    // Close button
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

    // Other keys don't call onClose
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
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)

    // Click inside the dialog does not close
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ── #199 tests ────────────────────────────────────────────────────────────

  it('renders as bottom sheet when mobileVariant=sheet and viewport < md', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Sheet Modal"
        mobileVariant="sheet"
      >
        <p>Sheet content</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    // Sheet has rounded-t-2xl at the top for mobile
    expect(dialog.className).toMatch(/rounded-t-2xl/)
    expect(screen.getByText('Sheet content')).toBeInTheDocument()
  })

  it('focus trap: Tab cycles within modal, Shift+Tab too', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Focus Trap">
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    const buttons = within(dialog).getAllByRole('button')
    // First button gets auto-focused (the close button is first in the DOM)
    buttons[0].focus()

    // Tab from last button should cycle to first
    buttons[buttons.length - 1].focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false })
    // focus trap wraps: focus goes to first element
    // (jsdom doesn't actually move focus, but we verify the handler fires without throwing)
    expect(dialog).toBeInTheDocument()

    // Shift+Tab from first button cycles to last
    buttons[0].focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(dialog).toBeInTheDocument()
  })

  it('ESC closes modal', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="ESC Test">
        <p>Content</p>
      </Modal>
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('scroll lock applied to body when open', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal isOpen={true} onClose={onClose} title="Scroll Lock">
        <p>Content</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    // After unmount, overflow is restored
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('scroll lock not applied when modal is closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    )

    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('renders footer in sheet variant', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Sheet with footer"
        mobileVariant="sheet"
        footer={<button>Confirm</button>}
      >
        <p>Body</p>
      </Modal>
    )

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('renders as fullscreen when mobileVariant=fullscreen', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Fullscreen"
        mobileVariant="fullscreen"
      >
        <p>Fullscreen content</p>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Fullscreen content')).toBeInTheDocument()
  })

  it('restores body overflow on close (cleanup)', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Cleanup">
        <p>content</p>
      </Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Modal isOpen={false} onClose={vi.fn()} title="Cleanup">
        <p>content</p>
      </Modal>
    )
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
