import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Users,
  UserPlus,
  Eye,
  Check,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import SearchBar from '../../components/ui/SearchBar'
import FilterPanel from '../../components/ui/FilterPanel'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import DatosPersonalesCard from '../../components/recepcion/DatosPersonalesCard'
import PlanPagoCard from '../../components/recepcion/PlanPagoCard'
import SaludCard from '../../components/recepcion/SaludCard'
import SocioResumenSidebar from '../../components/recepcion/SocioResumenSidebar'
import SocioDetailModal from '../../components/admin/SocioDetailModal'
import { getSocioColumns } from '../../components/admin/SocioColumns'
import { useSociosList, useSocioMutations } from '../../hooks/queries/useSociosData'
import { gestionSociosSchema, defaultValues } from './gestionSocios.schema'

export default function GestionSociosPage() {
  const [activeTab, setActiveTab] = useState('listado') // 'listado' | 'nuevo'

  // ─── Estado del listado ──────────────────────────────────────────
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ estado: '', con_certificado: '' })
  const [ordering, setOrdering] = useState('nombre')
  const [socioParaDetalle, setSocioParaDetalle] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const { data, isLoading } = useSociosList({
    page,
    pageSize,
    search,
    estado: filters.estado,
    con_certificado: filters.con_certificado,
    ordering,
  })

  const socios = data?.results || (Array.isArray(data) ? data : [])
  const totalCount = data?.count ?? socios.length

  // ─── Estado del formulario de recepción ──────────────────────────
  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(gestionSociosSchema),
    defaultValues,
  })

  const formData = watch()
  const onChange = (field, value) => setValue(field, value)

  const { create } = useSocioMutations()

  const onSubmit = async (data) => {
    try {
      await create.mutateAsync(data)
      reset()
      setActiveTab('listado')
    } catch {
      // toast.error is already handled by useSocioMutations onError
    }
  }

  const columns = getSocioColumns()

  const handleVerDetalle = (socio) => {
    setSocioParaDetalle(socio)
    setIsDetailModalOpen(true)
  }

  return (
    <AppLayout>
      <TopBar
        title="Recepción — Socios"
        rightContent={
          activeTab === 'nuevo' ? (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setActiveTab('listado')}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="gap-2"
                onClick={handleSubmit(onSubmit)}
              >
                <Check className="w-4 h-4" /> Crear socio
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              className="gap-2 shadow-md shadow-orange-500/20"
              onClick={() => setActiveTab('nuevo')}
            >
              <UserPlus className="w-4 h-4" /> Nuevo Socio
            </Button>
          )
        }
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        {/* Pestañas de Navegación con soporte ARIA */}
        <div
          role="tablist"
          aria-label="Pestañas de gestión de socios"
          className="flex items-center gap-2 border-b border-subtle pb-3"
        >
          <button
            role="tab"
            id="tab-listado"
            aria-selected={activeTab === 'listado'}
            aria-controls="panel-listado"
            onClick={() => setActiveTab('listado')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'listado'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-raised'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Listado de Socios</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'listado'
                  ? 'bg-white/20 text-white'
                  : 'bg-bg-raised text-text-secondary'
              }`}
            >
              {totalCount}
            </span>
          </button>

          <button
            role="tab"
            id="tab-nuevo"
            aria-selected={activeTab === 'nuevo'}
            aria-controls="panel-nuevo"
            onClick={() => setActiveTab('nuevo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'nuevo'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-raised'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Alta en Recepción</span>
          </button>
        </div>

        {/* ─── TAB 1: LISTADO DE SOCIOS PARA RECEPCIONISTA ─── */}
        {activeTab === 'listado' && (
          <div
            role="tabpanel"
            id="panel-listado"
            aria-labelledby="tab-listado"
            className="flex flex-col gap-5"
          >
            {/* Buscador y filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="w-full sm:w-80">
                <SearchBar
                  placeholder="Buscar socio por nombre, DNI o número..."
                  onSearch={(val) => {
                    setSearch(val)
                    setPage(1)
                  }}
                />
              </div>

              <FilterPanel
                filters={filters}
                onChange={(key, val) => {
                  setFilters((prev) => ({ ...prev, [key]: val }))
                  setPage(1)
                }}
                onClear={() => {
                  setFilters({ estado: '', con_certificado: '' })
                  setPage(1)
                }}
              />
            </div>

            {/* Tabla con datos reales */}
            <div className="flex flex-col gap-4">
              <DataTable
                columns={columns}
                data={socios}
                loading={isLoading}
                ordering={ordering}
                onSort={(newOrdering) => {
                  setOrdering(newOrdering || '')
                  setPage(1)
                }}
                emptyTitle="Sin socios"
                emptyMessage="No se encontraron socios con los filtros aplicados."
                onRowClick={handleVerDetalle}
                renderActions={(row) => (
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVerDetalle(row)
                      }}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
                      title="Ver detalle del socio"
                      aria-label={`Ver detalle del socio ${row.nombre} ${row.apellido}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />

              <Pagination
                currentPage={page}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}

        {/* ─── TAB 2: ALTA DE SOCIO EN RECEPCIÓN ─── */}
        {activeTab === 'nuevo' && (
          <div
            role="tabpanel"
            id="panel-nuevo"
            aria-labelledby="tab-nuevo"
            className="flex flex-col gap-6"
          >
            {Object.keys(errors).length > 0 && (
              <div className="p-3 rounded-xl bg-bg-raised border border-subtle">
                {Object.values(errors).map((e, i) => (
                  <p key={i} className="text-xs text-error-500">
                    {e.message}
                  </p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
              <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-4">
                <DatosPersonalesCard formData={formData} onChange={onChange} />
                <PlanPagoCard formData={formData} onChange={onChange} />
                <SaludCard onFileChange={() => {}} onChange={onChange} />
              </div>

              <div className="lg:col-span-1">
                <SocioResumenSidebar
                  nombre={formData.nombre}
                  apellido={formData.apellido}
                  dni={formData.dni}
                  plan={formData.plan}
                  cuota={formData.cuota}
                  cobro={formData.cobro}
                  renovacion={formData.renovacion}
                  onSubmit={handleSubmit(onSubmit)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalle para el recepcionista */}
      <SocioDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSocioParaDetalle(null)
        }}
        socio={socioParaDetalle}
      />
    </AppLayout>
  )
}
