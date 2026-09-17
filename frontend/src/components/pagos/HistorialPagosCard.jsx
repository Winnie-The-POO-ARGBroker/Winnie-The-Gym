import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Banknote } from 'lucide-react'
import Card from '../ui/Card'
import { listarPagos } from '../../services/pagosService'

const ESTADO_CONFIG = {
  aprobado:    { icon: CheckCircle, color: 'text-success-500', label: 'Aprobado' },
  rechazado:   { icon: XCircle,     color: 'text-error-500',   label: 'Rechazado' },
  cancelado:   { icon: XCircle,     color: 'text-error-500',   label: 'Cancelado' },
  pendiente:   { icon: Clock,       color: 'text-warning-500', label: 'Pendiente' },
  reembolsado: { icon: Banknote,    color: 'text-blue-500',    label: 'Reembolsado' },
}

const METODO_LABEL = {
  mercado_pago: 'MercadoPago',
  manual: 'Cobro manual',
}

function formatFecha(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Lista los últimos pagos de un socio.
 * @param {number|null} socioId  ID del socio. Si es null no carga nada.
 * @param {number}      limit    Cantidad máxima de pagos a mostrar.
 */
export default function HistorialPagosCard({ socioId, limit = 5 }) {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!socioId) {
      setPagos([])
      return
    }
    let cancelled = false
    setLoading(true)
    listarPagos({ socio: socioId, page_size: limit })
      .then((data) => {
        if (!cancelled) setPagos(data.results ?? data)
      })
      .catch(() => {
        if (!cancelled) setPagos([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [socioId, limit])

  return (
    <Card className="p-4 flex flex-col gap-3">
      <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">
        Historial de pagos
      </span>

      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-bg-raised animate-pulse" />
          ))}
        </div>
      )}

      {!loading && pagos.length === 0 && (
        <p className="text-xs text-text-tertiary text-center py-4">
          Sin pagos registrados
        </p>
      )}

      {!loading && pagos.length > 0 && (
        <ul className="flex flex-col divide-y divide-subtle">
          {pagos.map((pago) => {
            const cfg = ESTADO_CONFIG[pago.estado] ?? ESTADO_CONFIG.pendiente
            const Icon = cfg.icon
            return (
              <li key={pago.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {pago.plan_nombre}
                    </p>
                    <p className="text-[10px] text-text-tertiary">
                      {formatFecha(pago.paid_at ?? pago.created_at)} · {METODO_LABEL[pago.metodo] ?? pago.metodo}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-text-primary">
                    ${Number(pago.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                  </p>
                  <p className={`text-[10px] font-medium ${cfg.color}`}>
                    {cfg.label}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
