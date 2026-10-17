import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Modal from '../Modal'

/**
 * Harness: the opener lives inside <main>. When `unmountOpener` is true, the
 * opener disappears at the same time the modal closes (e.g. a table row that
 * is removed after the action completes).
 */
function Harness({ unmountOpener = false }) {
  const [open, setOpen] = useState(false)
  const [showOpener, setShowOpener] = useState(true)

  return (
    <div>
      <main data-testid="main-landmark">
        {showOpener && (
          <button type="button" onClick={() => setOpen(true)}>
            Abrir
          </button>
        )}
      </main>
      <Modal isOpen={open} onClose={() => {}} title="Detalle">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            if (unmountOpener) setShowOpener(false)
          }}
        >
          Confirmar
        </button>
      </Modal>
    </div>
  )
}

describe('Modal focus restoration (#350)', () => {
  it('returns focus to the opener when it is still mounted', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Abrir' })
    opener.focus()
    fireEvent.click(opener)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('falls back to the main landmark when the opener was unmounted', async () => {
    render(<Harness unmountOpener />)
    const opener = screen.getByRole('button', { name: 'Abrir' })
    opener.focus()
    fireEvent.click(opener)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(screen.getByTestId('main-landmark')).toHaveFocus())
  })
})
