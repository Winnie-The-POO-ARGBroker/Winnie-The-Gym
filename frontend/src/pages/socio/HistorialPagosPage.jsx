import { CreditCard } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import Badge from '../../components/ui/Badge'
import { useMisPagos } from '../../hooks/queries/useMisPagos'

function estadoBadgeVariant(estado) {
  switch (estado) {
    case 'aprobado': return 'success'
    case 'pendiente': return 'warning'
    case 'rechazado': return 'danger'
    default: return 'neutral'
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMonto(monto) {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)
}

export default function HistorialPagosPage() {
  const { data: pagos = [], isPending: loading } = useMisPagos()

  return (
    <AppLayout>
      <TopBar title="Mis Pagos" subtitle="Historial de pagos de tu membresía" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : pagos.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Sin pagos registrados"
              message="Todavía no hay pagos en tu historial."
            />
          ) : (
            <div className="rounded-2xl bg-bg-surface border border-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-subtle bg-bg-raised">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wide">Fecha</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wide">Plan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wide">Monto</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wide">Método</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {pagos.map((pago) => (
                      <tr key={pago.id} className="hover:bg-bg-raised transition-colors">
                        <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                          {formatDate(pago.created_at)}
                        </td>
                        <td className="px-4 py-3 text-text-primary font-medium">
                          {pago.plan_nombre ?? pago.plan ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-text-primary font-semibold">
                          {formatMonto(pago.monto)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary capitalize">
                          {pago.metodo ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={estadoBadgeVariant(pago.estado)}>
                            {pago.estado ?? '—'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
