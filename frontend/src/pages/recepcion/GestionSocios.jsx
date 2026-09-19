import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Users,
  UserPlus,
  Eye,
  FileCheck,
  FileText,
  Check,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
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
import { useSociosList } from '../../hooks/queries/useSociosData'
import { gestionSociosSchema, defaultValues } from './gestionSocios.schema'

export default function GestionSocios() {
  const [activeTab, setActiveTab] = useState('listado') // 'listado' | 'nuevo'

  // ─── Estado del listado ──────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ estado: '', con_certificado: '' })
  const [sortColumn, setSortColumn] = useState('nombre')
  const [sortDirection, setSortDirection] = useState('asc')
  const [socioParaDetalle, setSocioParaDetalle] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const orderingParam = sortColumn
    ? `${sortDirection === 'desc' ? '-' : ''}${sortColumn}`
    : ''

  const { data, isLoading } = useSociosList({
    page,
    pageSize,
    search,
    estado: filters.estado,
    con_certificado: filters.con_certificado,
    ordering: orderingParam,
  })

  const socios = data?.results || (Array.isArray(data) ? data : [])
  const totalCount = data?.count ?? socios.length

  // ─── Estado del formulario de recepción ──────────────────────────
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(gestionSociosSchema),
    defaultValues,
  })

  const formData = watch()
  const onChange = (field, value) => setValue(field, value)

  const onSubmit = (formDataSubmitted) => {
    console.log('Form submitted:', formDataSubmitted)
  }

  // Columnas para la tabla del recepcionista
  const columns = [
    {
      key: 'nombre',
      header: 'Socio',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={`${row.nombre || ''} ${row.apellido || ''}`.trim() || 'Socio'}
            size="sm"
          />
          <div>
            <div className="font-semibold text-text-primary">
              {row.nombre} {row.apellido}
            </div>
            <div className="text-xs text-text-secondary">
              Nº {row.numero_socio || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'dni',
      header: 'DNI',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.dni || '—'}
        </span>
      ),
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      sortable: false,
      render: (row) => (
        <span className="text-xs text-text-secondary">
          {row.telefono || '—'}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      render: (row) => {
        const est = (row.estado || '').toLowerCase()
        if (est === 'activo') return <Badge variant="success">Activo</Badge>
        if (est === 'suspendido') return <Badge variant="warning">Suspendido</Badge>
        if (est === 'baja') return <Badge variant="danger">Baja</Badge>
        return <Badge variant="warning">{row.estado || '—'}</Badge>
      },
    },
    {
      key: 'certificado',
      header: 'Certificado Médico',
      sortable: false,
      render: (row) => {
        const tiene = !!row.certificado_medico_url
        return tiene ? (
          <a
            href={row.certificado_medico_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
            title="Ver certificado médico"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Al día</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium">
            <FileText className="w-3.5 h-3.5 opacity-60" />
            <span>Sin certificado</span>
          </span>
        )
      },
    },
    {
      key: 'created_at',
      header: 'Fecha Alta',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-text-secondary">
          {row.created_at
            ? new Date(row.created_at).toLocaleDateString('es-AR')
            : '—'}
        </span>
      ),
    },
  ]

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
        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-2 border-b border-subtle pb-3">
          <button
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
          <div className="flex flex-col gap-5">
            {/* Buscador y filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="w-full sm:w-80">
                <SearchBar
                  placeholder="Buscar socio por nombre, DNI o número..."
                  onSearch={(val) => {
                    setSearch(val)
                    setPage(1)
                  }}
                  defaultValue={search}
                />
              </div>

              <FilterPanel
                filters={filters}
                onFilterChange={(f) => {
                  setFilters(f)
                  setPage(1)
                }}
                onClearFilters={() => {
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
                isLoading={isLoading}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={(col, dir) => {
                  setSortColumn(col)
                  setSortDirection(dir)
                }}
                emptyMessage="No se encontraron socios."
                onRowClick={handleVerDetalle}
                actions={(row) => (
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVerDetalle(row)
                      }}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
                      title="Ver detalle del socio"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />

              <Pagination
                count={totalCount}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize)
                  setPage(1)
                }}
              />
            </div>
          </div>
        )}

        {/* ─── TAB 2: ALTA DE SOCIO EN RECEPCIÓN ─── */}
        {activeTab === 'nuevo' && (
          <div className="flex flex-col gap-6">
            {Object.keys(errors).length > 0 && (
              <div className="p-3 rounded-xl bg-bg-raised border border-subtle">
                {Object.values(errors).map((e, i) => (
                  <p key={i} className="text-xs text-rose-500">
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
