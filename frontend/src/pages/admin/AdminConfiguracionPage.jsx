import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import { useGymConfig, useUpdateGymConfig } from '../../hooks/queries/useGymConfig'

const schema = z.object({
  nombre_gym: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  aforo_maximo: z.coerce.number().int().min(1, 'El aforo debe ser mayor a 0').max(9999),
  hora_apertura: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  hora_cierre: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  telefono_contacto: z.string().max(20).optional(),
})

const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary'

export default function AdminConfiguracionPage() {
  const { data: config, isPending: loading } = useGymConfig()
  const updateConfig = useUpdateGymConfig()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (config) {
      reset({
        nombre_gym: config.nombre_gym ?? '',
        aforo_maximo: config.aforo_maximo ?? 200,
        hora_apertura: config.hora_apertura ?? '07:00',
        hora_cierre: config.hora_cierre ?? '23:00',
        telefono_contacto: config.telefono_contacto ?? '',
      })
    }
  }, [config, reset])

  const onSubmit = async (values) => {
    try {
      await updateConfig.mutateAsync(values)
      toast.success('Configuración actualizada correctamente.')
    } catch (err) {
      const data = err?.response?.data
      const message =
        data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : (data?.detail ?? 'No se pudo guardar la configuración.')
      toast.error(message)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <TopBar title="Configuración del Gimnasio" subtitle="Parámetros generales del sistema" />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <TopBar
        title="Configuración del Gimnasio"
        subtitle="Parámetros generales del sistema"
        icon={<Settings className="w-5 h-5" />}
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl p-6 flex flex-col gap-6 bg-bg-surface border border-subtle">
            <h3 className="text-base font-semibold text-text-primary">Datos del gimnasio</h3>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              {/* Nombre del gimnasio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Nombre del gimnasio
                </label>
                <input {...register('nombre_gym')} className={inputCls} />
                {errors.nombre_gym && (
                  <span className="text-xs text-error-500">{errors.nombre_gym.message}</span>
                )}
              </div>

              {/* Aforo máximo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Aforo máximo
                </label>
                <input
                  {...register('aforo_maximo')}
                  type="number"
                  min={1}
                  max={9999}
                  className={inputCls}
                />
                {errors.aforo_maximo && (
                  <span className="text-xs text-error-500">{errors.aforo_maximo.message}</span>
                )}
              </div>

              {/* Horarios */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                    Hora de apertura
                  </label>
                  <input {...register('hora_apertura')} type="time" className={inputCls} />
                  {errors.hora_apertura && (
                    <span className="text-xs text-error-500">{errors.hora_apertura.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                    Hora de cierre
                  </label>
                  <input {...register('hora_cierre')} type="time" className={inputCls} />
                  {errors.hora_cierre && (
                    <span className="text-xs text-error-500">{errors.hora_cierre.message}</span>
                  )}
                </div>
              </div>

              {/* Teléfono de contacto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Teléfono de contacto
                </label>
                <input
                  {...register('telefono_contacto')}
                  type="tel"
                  placeholder="Ej: +54 11 1234-5678"
                  className={inputCls}
                />
                {errors.telefono_contacto && (
                  <span className="text-xs text-error-500">{errors.telefono_contacto.message}</span>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!isDirty}
                loading={isSubmitting}
                className="w-full"
              >
                Guardar configuración
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
