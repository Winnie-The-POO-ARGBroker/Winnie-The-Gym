import { useState } from 'react'
import { CalendarOff } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const SCOPE_OPTIONS = [
  {
    value: 'solo_esta',
    label: 'Solo esta fecha',
    description: 'Cancela unicamente la sesion de este dia. Las demas fechas se mantienen.',
  },
  {
    value: 'esta_y_siguientes',
    label: 'Esta y siguientes',
    description: 'Cancela esta sesion y todas las siguientes de la serie recurrente.',
  },
  {
    value: 'toda',
    label: 'Toda la serie',
    description: 'Cancela todas las sesiones de esta clase, incluyendo las pasadas.',
  },
]

/**
 * Modal to cancel a class session with 3 scope options.
 *
 * Props:
 *   isOpen       — boolean
 *   onClose      — () => void
 *   sesion       — { id, fecha, clase_nombre } | null
 *   onConfirm    — ({ scope, motivo }) => void
 *   loading      — boolean
 */
export default function CancelarSesionModal({ isOpen, onClose, sesion, onConfirm, loading = false }) {
  const [scope, setScope] = useState('solo_esta')
  const [motivo, setMotivo] = useState('')

  const handleClose = () => {
    setScope('solo_esta')
    setMotivo('')
    onClose()
  }

  const handleConfirm = () => {
    onConfirm({ scope, motivo })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancelar sesion"
      description={sesion ? `${sesion.clase_nombre ?? 'Clase'} — ${sesion.fecha ?? ''}` : undefined}
      icon={<CalendarOff className="w-5 h-5" />}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-5">
        {/* Scope selector */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Alcance de la cancelacion
          </p>
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setScope(opt.value)}
              data-testid={`scope-option-${opt.value}`}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                scope === opt.value
                  ? 'border-orange-500 bg-orange-500/8 text-text-primary'
                  : 'border-subtle bg-bg-raised text-text-secondary hover:border-strong hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                    scope === opt.value ? 'border-orange-500 bg-orange-500' : 'border-text-tertiary'
                  }`}
                />
                <span className="text-sm font-bold">{opt.label}</span>
              </div>
              <p className="text-xs text-text-tertiary pl-5.5 ml-5">{opt.description}</p>
            </button>
          ))}
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Motivo (opcional)
          </label>
          <textarea
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Instructor no disponible, problema en la sala..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-error-500 hover:bg-error-600 gap-2"
            data-testid="cancelar-sesion-confirm"
          >
            {loading ? 'Cancelando...' : 'Confirmar cancelacion'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
