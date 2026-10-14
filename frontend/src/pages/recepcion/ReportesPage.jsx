import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import FilterButton from '../../components/ui/FilterButton'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import EvolucionIngresosCard from '../../components/recepcion/EvolucionIngresosCard'
import AsistenciaSemanalCard from '../../components/recepcion/AsistenciaSemanalCard'
import MorosidadCard from '../../components/recepcion/MorosidadCard'
import MembresiasActivasCard from '../../components/recepcion/MembresiasActivasCard'
import ReportFilters, { INITIAL_FILTERS, CATEGORIAS } from '../../components/recepcion/ReportFilters'
import ReportExportButtons from '../../components/recepcion/ReportExportButtons'
import { exportReport } from '../../services/reportsService'
import { useReportesResumen } from '../../hooks/queries/useReportes'

/**
 * Converts an array of monthly income values into an SVG polyline path string.
 * Maps values onto a 400×100 viewport (inverted Y axis — higher values sit higher).
 */
function buildChartPath(serie) {
  if (!Array.isArray(serie) || serie.length === 0) {
    return 'M 0,80 L 100,70 L 200,60 L 300,50 L 400,30'
  }
  const maxVal = Math.max(...serie, 1)
  const step = 400 / Math.max(serie.length - 1, 1)
  return serie
    .map((val, i) => {
      const x = Math.round(i * step)
      const y = Math.round(100 - (val / maxVal) * 90)
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`
    })
    .join(' ')
}

/**
 * Maps the server summary shape into the flat metrics object the cards expect.
 */
function derivarMetrics(resumen) {
  if (!resumen) return null

  const { ingresos = {}, morosos = {}, membresias = {}, asistencia = {} } = resumen

  const mesActual = ingresos.mes_actual ?? 0
  const variacionPct = ingresos.variacion_pct ?? 0
  const vsAnteriorFormatted = `${variacionPct >= 0 ? '+' : ''}${variacionPct}%`

  const serie = Array.isArray(ingresos.serie_6_meses) ? ingresos.serie_6_meses : []
  const chartPath = buildChartPath(serie)

  const diasOrden = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
  const promedioDia = asistencia.promedio_dia ?? {}
  const dayCounts = diasOrden.map((d) => promedioDia[d] ?? 0)
  const maxDay = Math.max(...dayCounts, 1)
  const asistenciaBars = dayCounts.map((c) => Math.max(12, Math.round((c / maxDay) * 90)))

  return {
    ingresosMesFormatted: `$ ${mesActual.toLocaleString('es-AR')}`,
    vsAnteriorFormatted,
    chartPath,
    asistenciaBars,
    morososCount: morosos.cantidad ?? 0,
    adeudadoFormatted: `$ ${(morosos.monto_total ?? 0).toLocaleString('es-AR')}`,
    morosidadTasa: `${morosos.tasa_pct ?? 0}%`,
    morosidadPct: morosos.tasa_pct ?? 0,
    activasCount: String(membresias.activas ?? 0),
    porVencerCount: membresias.por_vencer_7d ?? 0,
    nuevasMesCount: membresias.nuevas_mes ?? 0,
  }
}

const DEFAULT_METRICS = {
  ingresosMesFormatted: '$ 0',
  vsAnteriorFormatted: '+0%',
  chartPath: 'M 0,80 L 100,70 L 200,60 L 300,50 L 400,30',
  asistenciaBars: [10, 10, 10, 10, 10, 10, 10],
  morososCount: 0,
  adeudadoFormatted: '$ 0',
  morosidadTasa: '0%',
  morosidadPct: 0,
  activasCount: '0',
  porVencerCount: 0,
  nuevasMesCount: 0,
}

export default function ReportesPage() {
  const tabs = ['Resumen', 'Morosidad', 'Asistencia', 'Ingresos']
  const [activeTab, setActiveTab] = useState('Resumen')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [downloadingFormat, setDownloadingFormat] = useState(null)

  const {
    data: resumen,
    isLoading: loadingMetrics,
    isError: errorMetrics,
    refetch: refetchMetrics,
  } = useReportesResumen({ mes: filters.mes, plan_id: filters.plan_id })

  const metrics = derivarMetrics(resumen) ?? DEFAULT_METRICS

  // Sincronizar cambio de tab con categoría de reporte
  const handleTabClick = (tab) => {
    setActiveTab(tab)
    if (tab === 'Morosidad') {
      setFilters((prev) => ({ ...prev, categoria: 'morosidad' }))
    } else if (tab === 'Asistencia') {
      setFilters((prev) => ({ ...prev, categoria: 'asistencia' }))
    } else if (tab === 'Ingresos') {
      setFilters((prev) => ({ ...prev, categoria: 'facturacion' }))
    }
  }

  // Sincronizar cambio de filtros con tabs
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    if (newFilters.categoria === 'morosidad') {
      setActiveTab('Morosidad')
    } else if (newFilters.categoria === 'asistencia') {
      setActiveTab('Asistencia')
    } else if (newFilters.categoria === 'facturacion') {
      setActiveTab('Ingresos')
    }
  }

  const handleResetFilters = () => {
    setFilters({
      ...INITIAL_FILTERS,
      categoria: filters.categoria,
    })
    toast.info('Filtros restablecidos')
  }

  const handleExport = async (formato, explicitCategory = null) => {
    const activeCategory = explicitCategory || filters.categoria || 'morosidad'
    const categoriaObj = CATEGORIAS.find((c) => c.id === activeCategory)
    const categoriaLabel = categoriaObj ? categoriaObj.label : activeCategory
    const toastId = toast.loading(`Generando reporte de ${categoriaLabel} en ${formato.toUpperCase()}...`)

    setDownloadingFormat(formato)
    try {
      const result = await exportReport(activeCategory, filters, formato)
      toast.success(`Reporte descargado: ${result.filename}`, { id: toastId })
    } catch (error) {
      console.error('Error al exportar reporte:', error)
      toast.error(error.message || 'Error al exportar el reporte', { id: toastId })
    } finally {
      setDownloadingFormat(null)
    }
  }

  return (
    <AppLayout>
      <TopBar
        title="Reportes"
        subtitle="Analíticas ejecutivas y exportación de datos"
        backAction={{ to: '/dashboard' }}
        rightContent={
          <ReportExportButtons
            onExport={handleExport}
            downloadingFormat={downloadingFormat}
          />
        }
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        {/* Navegación por Pestañas */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <FilterButton
                key={tab}
                active={activeTab === tab}
                size="md"
                onClick={() => handleTabClick(tab)}
              >
                {tab}
              </FilterButton>
            ))}
          </div>

          <div className="text-xs text-text-tertiary flex items-center gap-1.5">
            <span>Exportando categoría activa:</span>
            <span className="font-semibold text-primary capitalize px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
              {filters.categoria === 'facturacion' ? 'Facturación / Ingresos' : filters.categoria === 'morosidad' ? 'Morosidad' : 'Asistencia y Aforo'}
            </span>
          </div>
        </div>

        {/* Barra de Filtros del Reporte */}
        <ReportFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />

        {/* Tarjetas de Métricas y Analítica con datos reales */}
        {loadingMetrics ? (
          <div className="flex items-center justify-center p-12 text-text-secondary">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando analíticas...</span>
          </div>
        ) : errorMetrics ? (
          <div className="flex flex-col items-center gap-4 p-12 text-center">
            <AlertCircle className="w-10 h-10 text-error-500" />
            <p className="text-text-primary font-semibold">No se pudieron cargar las analíticas.</p>
            <button
              type="button"
              onClick={() => refetchMetrics()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(activeTab === 'Resumen' || activeTab === 'Ingresos') && (
              <EvolucionIngresosCard
                chartPoints={metrics.chartPath}
                estesMes={metrics.ingresosMesFormatted}
                vsAnterior={metrics.vsAnteriorFormatted}
                onExport={(fmt) => handleExport(fmt, 'facturacion')}
              />
            )}

            {(activeTab === 'Resumen' || activeTab === 'Asistencia') && (
              <AsistenciaSemanalCard
                bars={metrics.asistenciaBars}
                onExport={(fmt) => handleExport(fmt, 'asistencia')}
              />
            )}

            {(activeTab === 'Resumen' || activeTab === 'Morosidad') && (
              <MorosidadCard
                morosos={metrics.morososCount}
                adeudado={metrics.adeudadoFormatted}
                tasa={metrics.morosidadTasa}
                morosidadPct={metrics.morosidadPct}
                onExport={(fmt) => handleExport(fmt, 'morosidad')}
              />
            )}

            {(activeTab === 'Resumen' || activeTab === 'Morosidad' || activeTab === 'Asistencia') && (
              <MembresiasActivasCard
                activas={metrics.activasCount}
                porVencer={metrics.porVencerCount}
                nuevasMes={metrics.nuevasMesCount}
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
