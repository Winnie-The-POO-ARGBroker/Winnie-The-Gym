import { useState, useEffect } from 'react'
import { Filter, Calendar, RotateCcw, ShieldAlert, Receipt, Users } from 'lucide-react'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { getReportPlans } from '../../services/reportsService'

export const CATEGORIAS = [
  { id: 'morosidad', label: 'Morosidad', icon: ShieldAlert, desc: 'Socios con membresía vencida o pendiente' },
  { id: 'facturacion', label: 'Facturación / Ingresos', icon: Receipt, desc: 'Pagos aprobados del período' },
  { id: 'asistencia', label: 'Asistencia y Aforo', icon: Users, desc: 'Entradas y salidas con cálculo de permanencia' },
]

export const INITIAL_FILTERS = {
  categoria: 'morosidad',
  fecha_desde: '',
  fecha_hasta: '',
  mes: new Date().toISOString().slice(0, 7), // YYYY-MM actual
  estado: '',
  plan_id: '',
  metodo: '',
}

export default function ReportFilters({
  filters = INITIAL_FILTERS,
  onFilterChange,
  onResetFilters,
  className = '',
}) {
  const [planes, setPlanes] = useState([])
  const [loadingPlanes, setLoadingPlanes] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function fetchPlans() {
      setLoadingPlanes(true)
      try {
        const data = await getReportPlans()
        if (isMounted) setPlanes(data)
      } finally {
        if (isMounted) setLoadingPlanes(false)
      }
    }
    fetchPlans()
    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (key, value) => {
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        [key]: value,
      })
    }
  }

  const handlePreset = (presetType) => {
    const today = new Date()
    const formatDate = (d) => d.toISOString().slice(0, 10)

    if (presetType === 'hoy') {
      const todayStr = formatDate(today)
      onFilterChange({
        ...filters,
        fecha_desde: todayStr,
        fecha_hasta: todayStr,
        mes: today.toISOString().slice(0, 7),
      })
    } else if (presetType === '7dias') {
      const past7 = new Date()
      past7.setDate(today.getDate() - 7)
      onFilterChange({
        ...filters,
        fecha_desde: formatDate(past7),
        fecha_hasta: formatDate(today),
        mes: today.toISOString().slice(0, 7),
      })
    } else if (presetType === 'esteMes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      onFilterChange({
        ...filters,
        fecha_desde: formatDate(firstDay),
        fecha_hasta: formatDate(today),
        mes: today.toISOString().slice(0, 7),
      })
    } else if (presetType === 'mesAnterior') {
      const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0)
      onFilterChange({
        ...filters,
        fecha_desde: formatDate(firstDayPrev),
        fecha_hasta: formatDate(lastDayPrev),
        mes: firstDayPrev.toISOString().slice(0, 7),
      })
    }
  }

  const isFiltered = Boolean(
    filters.fecha_desde ||
    filters.fecha_hasta ||
    filters.estado ||
    filters.plan_id ||
    filters.metodo ||
    (filters.mes && filters.mes !== new Date().toISOString().slice(0, 7))
  )

  return (
    <div className={`bg-bg-surface border border-subtle rounded-2xl p-5 shadow-sm space-y-5 ${className}`}>
      {/* Header bar of filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-subtle">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">
            Filtros del Reporte
          </h2>
          {isFiltered && (
            <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
              Filtros activos
            </span>
          )}
        </div>

        {onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            disabled={!isFiltered}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Selector de Categoría / Tipo de Reporte */}
      <div>
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Categoría de Reporte
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon
            const isSelected = filters.categoria === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleChange('categoria', cat.id)}
                className={`flex items-start gap-3 p-3 text-left rounded-xl border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary'
                    : 'border-subtle bg-bg-base hover:bg-bg-raised text-text-secondary hover:text-text-primary'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? 'bg-primary text-white' : 'bg-bg-surface text-text-tertiary border border-subtle'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isSelected ? 'text-text-primary' : ''}`}>
                    {cat.label}
                  </div>
                  <div className="text-xs text-text-tertiary truncate">
                    {cat.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid de Filtros Condicionales según Categoría */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {/* Rango de Fechas / Período */}
        {filters.categoria === 'facturacion' ? (
          <div>
            <label htmlFor="filter-mes" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Mes de Facturación
            </label>
            <div className="relative">
              <input
                id="filter-mes"
                type="month"
                value={filters.mes || ''}
                onChange={(e) => handleChange('mes', e.target.value)}
                className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary py-2 px-3 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="fecha_desde" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Fecha Desde
              </label>
              <input
                id="fecha_desde"
                type="date"
                value={filters.fecha_desde || ''}
                onChange={(e) => handleChange('fecha_desde', e.target.value)}
                className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary py-2 px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="fecha_hasta" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Fecha Hasta
              </label>
              <input
                id="fecha_hasta"
                type="date"
                value={filters.fecha_hasta || ''}
                onChange={(e) => handleChange('fecha_hasta', e.target.value)}
                className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary py-2 px-3 text-sm"
              />
            </div>
          </div>
        )}

        {/* Filtros específicos de Morosidad */}
        {filters.categoria === 'morosidad' && (
          <>
            <Select
              label="Estado de Morosidad"
              id="filter-estado"
              value={filters.estado || ''}
              onChange={(e) => handleChange('estado', e.target.value)}
            >
              <option value="">Todos los morosos (vencida y pendiente)</option>
              <option value="vencida">Membresías Vencidas</option>
              <option value="pendiente_pago">Pendientes de Pago</option>
            </Select>

            <Select
              label="Plan de Membresía"
              id="filter-plan"
              value={filters.plan_id || ''}
              onChange={(e) => handleChange('plan_id', e.target.value)}
            >
              <option value="">
                {loadingPlanes ? 'Cargando planes...' : 'Todos los planes'}
              </option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </>
        )}

        {/* Filtros específicos de Facturación */}
        {filters.categoria === 'facturacion' && (
          <Select
            label="Método de Pago"
            id="filter-metodo"
            value={filters.metodo || ''}
            onChange={(e) => handleChange('metodo', e.target.value)}
          >
            <option value="">Todos los métodos</option>
            <option value="mercado_pago">Mercado Pago</option>
            <option value="manual">Cobro Manual en Recepción</option>
          </Select>
        )}

        {/* Nota informativa para Asistencia */}
        {filters.categoria === 'asistencia' && (
          <div className="flex items-center text-xs text-text-secondary bg-bg-base border border-subtle rounded-lg p-3">
            <span>
              Incluye entradas por código QR y egresos pareados con cálculo de permanencia en minutos.
            </span>
          </div>
        )}
      </div>

      {/* Presets rápidos de fechas */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-semibold text-text-tertiary flex items-center gap-1 mr-1">
          <Calendar className="w-3.5 h-3.5" />
          Rangos rápidos:
        </span>
        <button
          type="button"
          onClick={() => handlePreset('hoy')}
          className="text-xs px-2.5 py-1 rounded-md bg-bg-base hover:bg-bg-raised border border-subtle text-text-secondary transition-colors"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => handlePreset('7dias')}
          className="text-xs px-2.5 py-1 rounded-md bg-bg-base hover:bg-bg-raised border border-subtle text-text-secondary transition-colors"
        >
          Últimos 7 días
        </button>
        <button
          type="button"
          onClick={() => handlePreset('esteMes')}
          className="text-xs px-2.5 py-1 rounded-md bg-bg-base hover:bg-bg-raised border border-subtle text-text-secondary transition-colors"
        >
          Este mes
        </button>
        <button
          type="button"
          onClick={() => handlePreset('mesAnterior')}
          className="text-xs px-2.5 py-1 rounded-md bg-bg-base hover:bg-bg-raised border border-subtle text-text-secondary transition-colors"
        >
          Mes anterior
        </button>
      </div>
    </div>
  )
}
