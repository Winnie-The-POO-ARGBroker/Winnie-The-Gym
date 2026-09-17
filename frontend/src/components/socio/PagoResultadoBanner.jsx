import { CheckCircle, XCircle, Clock } from 'lucide-react'

const ESTADOS = {
  success: {
    icon: CheckCircle,
    colorClass: 'bg-success-500/10 border-success-500/30 text-success-500',
    titulo: '¡Pago aprobado!',
    mensaje: 'Tu membresía fue activada exitosamente. ¡Ya podés ingresar al gimnasio!',
  },
  failure: {
    icon: XCircle,
    colorClass: 'bg-error-500/10 border-error-500/30 text-error-500',
    titulo: 'Pago rechazado',
    mensaje: 'No se pudo procesar tu pago. Intentá nuevamente o acercate a recepción.',
  },
  pending: {
    icon: Clock,
    colorClass: 'bg-warning-500/10 border-warning-500/30 text-warning-500',
    titulo: 'Pago en proceso',
    mensaje: 'Tu pago está siendo procesado. Te avisaremos por email cuando se confirme.',
  },
}

/**
 * Banner contextual que se muestra al socio al volver de MercadoPago.
 * @param {'success'|'failure'|'pending'} estado
 */
export default function PagoResultadoBanner({ estado }) {
  const config = ESTADOS[estado]
  if (!config) return null

  const { icon: Icon, colorClass, titulo, mensaje } = config

  return (
    <div
      className={`p-3 rounded-lg border flex items-start gap-2.5 animate-scaleUp ${colorClass}`}
      role="alert"
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1">
        <span className="text-[11px] font-bold uppercase tracking-wide block">
          {titulo}
        </span>
        <span className="text-[11px] leading-tight block mt-0.5 opacity-80">
          {mensaje}
        </span>
      </div>
    </div>
  )
}
