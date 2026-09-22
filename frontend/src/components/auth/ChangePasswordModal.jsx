import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import api from '../../services/api'

const schema = z
  .object({
    old_password: z.string().min(1, 'Ingresá tu contraseña actual'),
    new_password1: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    new_password2: z.string().min(1, 'Confirmá la nueva contraseña'),
  })
  .refine((data) => data.new_password1 === data.new_password2, {
    message: 'Las contraseñas no coinciden',
    path: ['new_password2'],
  })

export default function ChangePasswordModal({ isOpen, onClose }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) reset()
  }, [isOpen, reset])

  const onSubmit = async (values) => {
    try {
      await api.post('/auth/password/change/', values)
      toast.success('Contraseña actualizada correctamente.')
      onClose()
    } catch (err) {
      const data = err?.response?.data
      const message =
        data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : (data?.detail ?? 'No se pudo cambiar la contraseña. Intentá de nuevo.')
      toast.error(message)
    }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar contraseña"
      description="Ingresá tu contraseña actual y la nueva."
      icon={<Lock className="w-5 h-5" />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Contraseña actual
          </label>
          <input
            {...register('old_password')}
            type="password"
            autoComplete="current-password"
            className={inputCls}
          />
          {errors.old_password && (
            <span className="text-xs text-error-500">{errors.old_password.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Nueva contraseña
          </label>
          <input
            {...register('new_password1')}
            type="password"
            autoComplete="new-password"
            className={inputCls}
          />
          {errors.new_password1 && (
            <span className="text-xs text-error-500">{errors.new_password1.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Confirmar nueva contraseña
          </label>
          <input
            {...register('new_password2')}
            type="password"
            autoComplete="new-password"
            className={inputCls}
          />
          {errors.new_password2 && (
            <span className="text-xs text-error-500">{errors.new_password2.message}</span>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} className="flex-1">
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Modal>
  )
}
