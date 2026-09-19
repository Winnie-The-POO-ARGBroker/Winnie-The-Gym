import { useState } from 'react'
import { toast } from 'sonner'
import { BarChart3 } from 'lucide-react'
import FilterButton from '../../components/ui/FilterButton'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import EmptyState from '../../components/ui/EmptyState'
import EvolucionIngresosCard from '../../components/recepcion/EvolucionIngresosCard'
import AsistenciaSemanalCard from '../../components/recepcion/AsistenciaSemanalCard'
import MorosidadCard from '../../components/recepcion/MorosidadCard'
import MembresiasActivasCard from '../../components/recepcion/MembresiasActivasCard'
import ReportFilters, { INITIAL_FILTERS, CATEGORIAS } from '../../components/recepcion/ReportFilters'
import ReportExportButtons from '../../components/recepcion/ReportExportButtons'
import { exportReport } from '../../services/reportsService'

const IS_DEV = import.meta.env.DEV

export default function ReportesPage() {
  const tabs = ['Resumen', 'Morosidad', 'Asistencia', 'Ingresos']
  const [activeTab, setActiveTab] = useState('Resumen')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [downloadingFormat, setDownloadingFormat] = useState(null)

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

  const handleExport = async (formato) => {
    const activeCategory = filters.categoria || 'morosidad'
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

          <div className="text-xs text-text-tertiary">
            Exportando categoría activa:{' '}
            <span className="font-semibold text-text-primary capitalize">
              {filters.categoria === 'facturacion' ? 'Facturación / Ingresos' : filters.categoria}
            </span>
          </div>
        </div>

        {/* Barra de Filtros del Reporte */}
        <ReportFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />

        {/* Tarjetas de Métricas y Analítica */}
        {IS_DEV ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(activeTab === 'Resumen' || activeTab === 'Ingresos') && (
              <EvolucionIngresosCard
                chartPoints="M 0,60 L 50,70 L 100,50 L 150,60 L 200,40 L 250,55 L 300,30 L 350,45 L 400,20"
                estesMes="$ 4.8M"
                vsAnterior="+12%"
              />
            )}

            {(activeTab === 'Resumen' || activeTab === 'Asistencia') && (
              <AsistenciaSemanalCard
                bars={[40, 60, 55, 75, 85, 60, 45]}
              />
            )}

            {(activeTab === 'Resumen' || activeTab === 'Morosidad') && (
              <MorosidadCard
                morosos={34}
                adeudado="$412k"
                tasa="8.2%"
                morosidadPct={25}
              />
            )}

            {(activeTab === 'Resumen' || activeTab === 'Morosidad' || activeTab === 'Asistencia') && (
              <MembresiasActivasCard
                activas="1.240"
                porVencer={86}
                nuevasMes={24}
              />
            )}
          </div>
        ) : (
          <div className="bg-bg-surface border border-subtle rounded-2xl p-8 text-center">
            <EmptyState
              icon={BarChart3}
              title="Métricas ejecutivas consolidadas"
              message="Los gráficos de evolución e indicadores se consolidan automáticamente con los cierres diarios de caja y asistencia."
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
