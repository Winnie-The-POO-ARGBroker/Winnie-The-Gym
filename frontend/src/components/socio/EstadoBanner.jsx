import { AlertTriangle } from 'lucide-react'

/**
 * EstadoBanner — reusable banner displayed when user.estado != 'activo'.
 * Renders a red alert for 'suspendido' or 'baja' states with an optional motivo.
 *
 * @param {Object} props
 * @param {'suspendido'|'baja'|string} props.estado  - socio state from auth store
 * @param {string} [props.motivo]                    - optional reason text
 */
export default function EstadoBanner({ estado, motivo }) {
  if (!estado || estado === 'activo') return null

  const isBaja = estado === 'baja'
  const isSuspendido = estado === 'suspendido'

  if (!isBaja && !isSuspendido) return null

  const title = isBaja
    ? 'Tu cuenta está dada de baja'
    : 'Tu cuenta está suspendida'

  const description = isBaja
    ? 'Contactá a recepción para más información.'
    : 'No podés realizar reservas ni usar el QR mientras tu cuenta esté suspendida.'

  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-4 rounded-xl bg-error-500/10 border border-error-500/30"
      data-testid="estado-banner"
    >
      <AlertTriangle className="w-5 h-5 text-error-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-bold text-error-500">{title}</p>
        {motivo && (
          <p className="text-xs text-error-500/80 mt-0.5">
            Motivo: {motivo}
          </p>
        )}
        <p className="text-xs text-text-secondary mt-1">{description}</p>
      </div>
    </div>
  )
}
