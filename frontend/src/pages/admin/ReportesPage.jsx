import { useState } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import FilterButton from '../../components/ui/FilterButton'
import { exportReport } from '../../services/reportsService'
import api from '../../services/api'

// ─── Aforo histórico tab ──────────────────────────────────────────────────────

const GRANULARIDAD_OPTIONS = [
  { value: 'hora', label: 'Por hora' },
  { value: 'dia', label: 'Por día' },
]

const DIAS_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatHora(bucket) {
  if (!bucket) return '—'
  // bucket may be ISO or HH:mm
  if (bucket.includes('T')) {
    return new Date(bucket).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
  return bucket
}

function AforoHistoricoTab() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [desde, setDesde] = useState(thirtyDaysAgo)
  const [hasta, setHasta] = useState(today)
  const [granularidad, setGranularidad] = useState('dia')

  // Check if range > 92 days
  const rangoExcedido = desde && hasta && (new Date(hasta) - new Date(desde)) / (1000 * 60 * 60 * 24) > 92

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['aforo', 'historico', desde, hasta, granularidad],
    queryFn: async () => {
      const res = await api.get('/access/aforo/historico/', {
        params: { desde, hasta, granularidad },
      })
      return res.data
    },
    enabled: !rangoExcedido && !!desde && !!hasta,
    staleTime: 2 * 60_000,
    retry: 1,
  })

  const serie = data?.serie ?? []
  const heatmap = data?.heatmap ?? {}

  // Build heatmap grid: rows = dia_semana (0-6), cols = hour (0-23)
  const maxHeatVal = Math.max(...Object.values(heatmap), 1)

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Granularidad</label>
          <select
            value={granularidad}
            onChange={(e) => setGranularidad(e.target.value)}
            className="bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3"
          >
            {GRANULARIDAD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <Button
          variant="primary"
          size="sm"
          disabled={rangoExcedido}
          onClick={() => refetch()}
        >
          Consultar
        </Button>
      </Card>

      {rangoExcedido && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-warning-500/10 border border-warning-500/30 text-warning-500 text-sm font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          El rango máximo permitido es de 92 días.
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-4 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-error-500" />
          <p className="text-sm font-semibold text-text-primary">No se pudo cargar el análisis de aforo.</p>
        </div>
      )}

      {!isLoading && !isError && serie.length > 0 && (
        <>
          {/* Line chart — simplified SVG */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Ingresos en el período</h3>
            <div className="overflow-x-auto">
              <svg viewBox="0 0 800 120" className="w-full h-32" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="var(--color-primary, #f97316)"
                  strokeWidth="2"
                  points={serie.map((p, i) => {
                    const maxIngresos = Math.max(...serie.map((s) => s.ingresos), 1)
                    const x = (i / Math.max(serie.length - 1, 1)) * 800
                    const y = 110 - (p.ingresos / maxIngresos) * 100
                    return `${x},${y}`
                  }).join(' ')}
                />
              </svg>
            </div>
            {/* Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-tertiary border-b border-subtle">
                    <th className="text-left py-2 pr-4">Período</th>
                    <th className="text-right py-2 pr-4">Ingresos</th>
                    <th className="text-right py-2 pr-4">Pico concurrente</th>
                    <th className="text-right py-2">Permanencia prom. (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {serie.map((row, i) => (
                    <tr key={i} className="border-b border-subtle/50 hover:bg-bg-raised transition-colors">
                      <td className="py-2 pr-4 font-mono text-text-primary">{formatHora(row.bucket)}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-text-primary">{row.ingresos}</td>
                      <td className="py-2 pr-4 text-right text-text-secondary">{row.pico_concurrente ?? '—'}</td>
                      <td className="py-2 text-right text-text-secondary">{row.permanencia_promedio_min ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Heatmap día-semana × hora */}
          {Object.keys(heatmap).length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Heatmap de aforo (día × hora)</h3>
              <div className="overflow-x-auto">
                <div className="flex gap-1 mb-1 pl-8">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="w-5 text-center text-[9px] text-text-tertiary shrink-0">{h}</div>
                  ))}
                </div>
                {DIAS_LABELS.map((dia, dIdx) => (
                  <div key={dIdx} className="flex items-center gap-1 mb-1">
                    <span className="w-7 text-[10px] text-text-tertiary shrink-0">{dia}</span>
                    {Array.from({ length: 24 }, (_, h) => {
                      const key = `${dIdx}_${h}`
                      const val = heatmap[key] ?? 0
                      const opacity = val > 0 ? Math.max(0.1, val / maxHeatVal) : 0
                      return (
                        <div
                          key={h}
                          className="w-5 h-5 rounded-sm shrink-0"
                          style={{ backgroundColor: `rgba(249, 115, 22, ${opacity})` }}
                          title={`${dia} ${h}:00 — ${val} ingresos prom.`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {!isLoading && !isError && !rangoExcedido && serie.length === 0 && desde && hasta && (
        <div className="text-center text-sm text-text-tertiary py-12">
          Sin datos para el período seleccionado.
        </div>
      )}
    </div>
  )
}

// ─── Clases tab ───────────────────────────────────────────────────────────────

const CLASES_SUB_TABS = [
  { key: 'ocupacion', label: 'Ocupación' },
  { key: 'asistencia', label: 'Asistencia' },
  { key: 'no_shows', label: 'No-shows' },
]

function ClasesReportesTab() {
  const [subTab, setSubTab] = useState('ocupacion')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [exportando, setExportando] = useState(null)

  const endpointMap = {
    ocupacion: '/reports/clases/ocupacion/',
    asistencia: '/reports/clases/asistencia/',
    no_shows: '/reports/clases/no_shows/',
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clases', 'reportes', subTab, desde, hasta],
    queryFn: async () => {
      const params = {}
      if (desde) params.fecha_desde = desde
      if (hasta) params.fecha_hasta = hasta
      const res = await api.get(endpointMap[subTab], { params })
      return res.data
    },
    staleTime: 2 * 60_000,
    retry: 1,
  })

  const rows = data?.results ?? (Array.isArray(data) ? data : [])

  const handleExport = async (formato) => {
    setExportando(formato)
    try {
      await exportReport(`clases_${subTab}`, { fecha_desde: desde, fecha_hasta: hasta }, formato)
      toast.success(`Reporte exportado en ${formato.toUpperCase()}`)
    } catch (err) {
      toast.error(err.message || 'Error al exportar')
    } finally {
      setExportando(null)
    }
  }

  // Derive columns from first row keys
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <div className="flex flex-col gap-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {CLASES_SUB_TABS.map((t) => (
          <FilterButton
            key={t.key}
            active={subTab === t.key}
            onClick={() => setSubTab(t.key)}
            size="sm"
          >
            {t.label}
          </FilterButton>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          {['csv', 'xlsx', 'pdf'].map((fmt) => (
            <Button
              key={fmt}
              variant="secondary"
              size="sm"
              className="gap-1.5"
              loading={exportando === fmt}
              onClick={() => handleExport(fmt)}
            >
              <Download className="w-3.5 h-3.5" />
              {fmt.toUpperCase()}
            </Button>
          ))}
        </div>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-4 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-error-500" />
          <p className="text-sm font-semibold text-text-primary">No se pudo cargar el reporte.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center text-sm text-text-tertiary py-12">
          Sin datos para los filtros seleccionados.
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-subtle bg-bg-raised/60">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="text-left py-2.5 px-3 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-subtle/50 hover:bg-bg-raised transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="py-2.5 px-3 text-text-primary">
                        {row[col] != null ? String(row[col]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'aforo_historico', label: 'Aforo histórico' },
  { key: 'clases', label: 'Clases' },
]

export default function AdminReportesPage() {
  const [activeTab, setActiveTab] = useState('aforo_historico')

  return (
    <AppLayout>
      <TopBar
        title="Reportes Avanzados"
        subtitle="Analíticas de aforo y clases"
        backAction={{ to: '/dashboard' }}
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        {/* Tab navigation */}
        <div className="flex gap-2">
          {TABS.map((t) => (
            <FilterButton
              key={t.key}
              active={activeTab === t.key}
              onClick={() => setActiveTab(t.key)}
              size="md"
            >
              {t.label}
            </FilterButton>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'aforo_historico' && <AforoHistoricoTab />}
        {activeTab === 'clases' && <ClasesReportesTab />}
      </div>
    </AppLayout>
  )
}
