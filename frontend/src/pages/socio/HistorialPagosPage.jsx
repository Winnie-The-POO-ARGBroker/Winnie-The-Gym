import { CreditCard, Download } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { useMisPagos } from '../../hooks/queries/useMisPagos'
import { pagoEstadoVariant, pagoEstadoLabel } from '../../constants/pagos'
import { descargarComprobante } from '../../services/pagosService'

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

function buildColumns(onDescargar) {
  return [
    {
      key: 'created_at',
      label: 'Fecha',
      mobile: 'Fecha',
      render: (row) => (
        <span className="font-mono text-xs">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      mobile: 'Plan',
      render: (row) => row.plan_nombre ?? row.plan ?? '—',
    },
    {
      key: 'monto',
      label: 'Monto',
      mobile: 'Monto',
      render: (row) => (
        <span className="font-semibold">{formatMonto(row.monto)}</span>
      ),
    },
    {
      key: 'metodo',
      label: 'Método',
      mobile: 'Método',
      render: (row) => {
        const medio = row.medio_manual ?? row.metodo
        return <span className="capitalize">{medio ?? '—'}</span>
      },
    },
    {
      key: 'cobrado_por',
      label: 'Cobrado por',
      mobile: 'Cobrado por',
      render: (row) => (
        <span className="text-xs text-text-secondary">{row.cobrado_por_nombre ?? '—'}</span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      mobile: 'Estado',
      render: (row) => (
        <Badge variant={pagoEstadoVariant(row.estado)}>{pagoEstadoLabel(row.estado)}</Badge>
      ),
    },
    {
      key: 'comprobante',
      label: '',
      mobile: '',
      render: (row) =>
        row.estado === 'aprobado' ? (
          <button
            type="button"
            data-testid={`comprobante-btn-${row.id}`}
            onClick={(e) => { e.stopPropagation(); onDescargar(row.id) }}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Comprobante
          </button>
        ) : null,
    },
  ]
}

export default function HistorialPagosPage() {
  const { data: pagos = [], isPending: loading } = useMisPagos()

  const handleDescargar = async (pagoId) => {
    try {
      await descargarComprobante(pagoId)
    } catch {
      toast.error('No se pudo descargar el comprobante.')
    }
  }

  const COLUMNS = buildColumns(handleDescargar)

  return (
    <AppLayout>
      <TopBar title="Mis Pagos" subtitle="Historial de pagos de tu membresía" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {!loading && pagos.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Sin pagos registrados"
              message="Todavía no hay pagos en tu historial."
            />
          ) : (
            <DataTable
              columns={COLUMNS}
              data={pagos}
              loading={loading}
              mobileMode="cards"
              emptyTitle="Sin pagos registrados"
              emptyMessage="Todavía no hay pagos en tu historial."
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
