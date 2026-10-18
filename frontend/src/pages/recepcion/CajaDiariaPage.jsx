import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Smartphone,
  MoreHorizontal,
  Download,
  TrendingDown,
  DollarSign,
} from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import api from '../../services/api'
import useAuthStore from '../../stores/authStore'
import { useStaffList } from '../../hooks/queries/useStaff'
import { hoyISO } from '../../utils/formatDate'

// ─── Constants ────────────────────────────────────────────────────────────────

const MEDIOS = [
  { key: 'efectivo',      label: 'Efectivo',       icon: Banknote,       color: 'text-green-500' },
  { key: 'transferencia', label: 'Transferencia',   icon: ArrowLeftRight, color: 'text-blue-500' },
  { key: 'debito',        label: 'Débito',          icon: CreditCard,     color: 'text-purple-500' },
  { key: 'credito',       label: 'Crédito',         icon: Smartphone,     color: 'text-orange-500' },
  { key: 'otro',          label: 'Otro',            icon: MoreHorizontal, color: 'text-text-secondary' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatARS(value) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value ?? 0)
}

function buildCsvRows(data) {
  const rows = [['Medio', 'Cantidad', 'Total']]
  MEDIOS.forEach(({ key, label }) => {
    const m = data?.cobros_por_medio?.[key]
    rows.push([label, m?.count ?? 0, m?.total ?? 0])
  })
  rows.push(['', '', ''])
  rows.push(['Total cobros', '', data?.total_cobros ?? 0])
  rows.push(['Total anulaciones', '', data?.total_anulaciones ?? 0])
  return rows.map((r) => r.join(',')).join('\n')
}

function downloadCSV(content, filename) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Medio card ───────────────────────────────────────────────────────────────

function MedioCard({ medio, data, loading = false }) {
  const Icon = medio.icon
  const medioData = data?.cobros_por_medio?.[medio.key]
  return (
    <div data-testid={`card-medio-${medio.key}`}>
      <Card className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${medio.color}`} />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {medio.label}
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-6 w-24 rounded" />
        ) : (
          <>
            <p className="text-xl font-bold text-text-primary">
              {formatARS(medioData?.total ?? 0)}
            </p>
            <p className="text-xs text-text-tertiary">
              {medioData?.count ?? 0} cobro{(medioData?.count ?? 0) !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </Card>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CajaDiariaPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.rol === 'administrador'

  const [fecha, setFecha] = useState(hoyISO)
  const [operadorId, setOperadorId] = useState('')

  const { data: staffData } = useStaffList({ enabled: isAdmin })
  // /users/staff/ answers with the paginated shape { count, results }.
  const staffList = Array.isArray(staffData) ? staffData : staffData?.results ?? []

  const queryParams = { fecha }
  if (isAdmin && operadorId) queryParams.operador_id = operadorId

  const {
    data: cajaData,
    isPending: loading,
    isError,
  } = useQuery({
    queryKey: ['caja', 'diaria', queryParams],
    queryFn: async () => {
      const res = await api.get('/payments/caja/', { params: queryParams })
      return res.data
    },
    staleTime: 30_000,
  })

  const handleExportCSV = () => {
    const csv = buildCsvRows(cajaData)
    const operadorLabel = operadorId
      ? staffList.find((s) => String(s.id) === String(operadorId))?.username ?? operadorId
      : 'todos'
    downloadCSV(csv, `caja_${fecha}_${operadorLabel}.csv`)
  }

  return (
    <AppLayout>
      <TopBar
        title="Caja diaria"
        subtitle="Resumen de cobros por medio de pago"
        backAction={{ to: '/dashboard' }}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          {/* ── Filtros ── */}
          <Card className="p-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                data-testid="caja-fecha-input"
                className="px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
              />
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Operador
                </label>
                <select
                  value={operadorId}
                  onChange={(e) => setOperadorId(e.target.value)}
                  data-testid="caja-operador-select"
                  className="px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors appearance-none min-w-[180px]"
                >
                  <option value="">Todos los operadores</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={loading || isError || !cajaData}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="caja-export-btn"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </Card>

          {/* ── Cards por medio ── */}
          {isError ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-error-500">No se pudo cargar la caja. Intentá de nuevo.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {MEDIOS.map((m) => (
                <MedioCard key={m.key} medio={m} data={cajaData} loading={loading} />
              ))}
            </div>
          )}

          {/* ── Resumen totales ── */}
          {!loading && !isError && cajaData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 flex flex-col gap-1 border-green-500/20 bg-green-500/5">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Total cobros
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-500" data-testid="caja-total-cobros">
                  {formatARS(cajaData.total_cobros)}
                </p>
              </Card>

              <Card className="p-4 flex flex-col gap-1 border-error-500/20 bg-error-500/5">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-error-500" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Anulaciones
                  </span>
                </div>
                <p className="text-2xl font-bold text-error-500" data-testid="caja-total-anulaciones">
                  {formatARS(cajaData.total_anulaciones)}
                </p>
              </Card>

              <Card className="p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-text-secondary" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Neto
                  </span>
                </div>
                <p className="text-2xl font-bold text-text-primary" data-testid="caja-neto">
                  {formatARS((cajaData.total_cobros ?? 0) - (cajaData.total_anulaciones ?? 0))}
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
