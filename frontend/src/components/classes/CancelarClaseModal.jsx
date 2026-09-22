import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { XCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const schema = z.object({
  motivo: z
    .string()
    .min(10, 'El motivo debe tener al menos 10 caracteres')
    .max(500, 'El motivo no puede superar los 500 caracteres'),
})

/**
 * Modal for staff to soft-cancel a class with a mandatory reason.
 *
 * @param {boolean}  isOpen
 * @param {function} onClose
 * @param {object}   clase   — the Clase object being cancelled
 * @param {function} onConfirm(motivo) — called with the motivo string when submitted;
 *                                        the parent handles the API call + toast.
 * @param {boolean}  [loading=false] — show loading state while the mutation is in flight
 */
export default function CancelarClaseModal({ isOpen, onClose, clase, onConfirm, loading = false }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (isOpen) reset()
  }, [isOpen, reset])

  const onSubmit = ({ motivo }) => {
    onConfirm(motivo)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar clase"
      description={clase ? `${clase.nombre} — ${clase.dia} ${clase.hora}` : ''}
      icon={<XCircle className="w-5 h-5 text-error-500" />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
        <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/20 text-error-500 text-sm">
          Esta acción cancela la clase y notifica a todos los socios inscriptos por email.
          No es reversible desde el panel.
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Motivo de cancelación <span className="text-error-500">*</span>
          </label>
          <textarea
            {...register('motivo')}
            rows={4}
            placeholder="Describe el motivo (mínimo 10 caracteres)..."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary resize-none"
          />
          {errors.motivo && (
            <span className="text-xs text-error-500">{errors.motivo.message}</span>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={loading} className="flex-1">
            Confirmar cancelación
          </Button>
        </div>
      </form>
    </Modal>
  )
}
