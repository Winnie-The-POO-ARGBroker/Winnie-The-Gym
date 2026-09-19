import { useState } from 'react'
import {
  Users,
  UserCheck,
  FileCheck,
  UserX,
  Plus,
  Eye,
  Edit2,
  Trash2,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import SearchBar from '../../components/ui/SearchBar'
import FilterPanel from '../../components/ui/FilterPanel'
import SocioFormModal from '../../components/admin/SocioFormModal'
import { useSociosList, useSocioMutations } from '../../hooks/queries/useSociosData'

export default function AdminSociosPage({
  onVerDetalle,
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ estado: '', con_certificado: '' })
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [socioABajar, setSocioABajar] = useState(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [socioToEdit, setSocioToEdit] = useState(null)

  // Calcular parámetro ordering para DRF
  const orderingParam = sortColumn
    ? `${sortDirection === 'desc' ? '-' : ''}${sortColumn}`
    : ''

  // Query paginada de socios
  const { data, isLoading, isError, refetch } = useSociosList({
    page,
    pageSize,
    search,
    estado: filters.estado,
    con_certificado: filters.con_certificado,
    ordering: orderingParam,
  })

  const { create, patch, baja, certificado } = useSocioMutations()

  const socios = data?.results || (Array.isArray(data) ? data : [])
  const totalCount = data?.count ?? socios.length

  // Manejadores
  const handleSearch = (term) => {
    setSearch(term)
    setPage(1)
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters({ estado: '', con_certificado: '' })
    setPage(1)
  }

  const handleSort = (column, direction) => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  const handleAbrirNuevo = () => {
    setSocioToEdit(null)
    setIsFormModalOpen(true)
  }

  const handleAbrirEditar = (socio) => {
    setSocioToEdit(socio)
    setIsFormModalOpen(true)
  }

  const handleSaveSocio = async (formData, certificadoFile) => {
    let socioId = formData.id
    if (socioId) {
      await patch.mutateAsync({ id: socioId, data: formData })
    } else {
      const res = await create.mutateAsync(formData)
      socioId = res?.id
    }

    // Si se seleccionó certificado médico, subirlo (HU03, RF08)
    if (certificadoFile && socioId) {
      await certificado.mutateAsync({ id: socioId, archivo: certificadoFile })
    }

    setIsFormModalOpen(false)
    setSocioToEdit(null)
  }

  const handleConfirmarBaja = async () => {
    if (!socioABajar) return
    await baja.mutateAsync(socioABajar.id)
    setSocioABajar(null)
  }

  // Definición de columnas de la tabla
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

  return (
    <AppLayout>
      <TopBar
        title="Gestión de Socios"
        rightContent={
          <Button
            variant="primary"
            className="gap-2 shadow-md shadow-orange-500/20"
            onClick={handleAbrirNuevo}
          >
            <Plus className="w-4 h-4" /> Nuevo Socio
          </Button>
        }
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        {/* Tarjetas de métricas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-bg-surface border border-subtle flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Socios</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {isLoading ? '...' : totalCount}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bg-surface border border-subtle flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Activos (página actual)</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {isLoading
                  ? '...'
                  : socios.filter((s) => s.estado === 'activo').length}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bg-surface border border-subtle flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Con Certificado</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {isLoading
                  ? '...'
                  : socios.filter((s) => !!s.certificado_medico_url).length}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bg-surface border border-subtle flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Bajas (página actual)</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {isLoading
                  ? '...'
                  : socios.filter((s) => s.estado === 'baja').length}
              </h3>
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <SearchBar
              placeholder="Buscar por nombre, DNI o número..."
              onSearch={handleSearch}
              defaultValue={search}
            />
          </div>

          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Tabla de socios con paginación */}
        <div className="flex flex-col gap-4">
          <DataTable
            columns={columns}
            data={socios}
            isLoading={isLoading}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            emptyMessage={
              search || filters.estado || filters.con_certificado
                ? 'No se encontraron socios que coincidan con la búsqueda o filtros.'
                : 'No hay socios registrados en el gimnasio todavía.'
            }
            onRowClick={(row) => onVerDetalle && onVerDetalle(row)}
            actions={(row) => (
              <div className="flex items-center gap-1 justify-end">
                {onVerDetalle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onVerDetalle(row)
                    }}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
                    title="Ver detalle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAbrirEditar(row)
                  }}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-orange-500 hover:bg-bg-raised transition-colors"
                  title="Editar socio"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {row.estado !== 'baja' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSocioABajar(row)
                    }}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-rose-500 hover:bg-bg-raised transition-colors"
                    title="Dar de baja socio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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

      {/* Modal de confirmación para dar de baja */}
      {socioABajar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-bg-surface border border-subtle rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 rounded-xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-text-primary">
                  Dar de baja socio
                </h4>
                <p className="text-xs text-text-secondary">
                  Esta acción cambiará el estado a "baja".
                </p>
              </div>
            </div>

            <p className="text-sm text-text-secondary">
              ¿Estás seguro de que deseas dar de baja al socio{' '}
              <strong className="text-text-primary">
                {socioABajar.nombre} {socioABajar.apellido}
              </strong>{' '}
              (DNI: {socioABajar.dni})?
            </p>

            <div className="flex items-center justify-end gap-3 mt-2">
              <Button
                variant="secondary"
                onClick={() => setSocioABajar(null)}
                disabled={baja.isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmarBaja}
                disabled={baja.isLoading}
                className="gap-2"
              >
                {baja.isLoading ? 'Procesando...' : 'Confirmar Baja'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de alta / edición de socio */}
      <SocioFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setSocioToEdit(null)
        }}
        onSave={handleSaveSocio}
        socioToEdit={socioToEdit}
        isLoading={create.isLoading || patch.isLoading || certificado.isLoading}
      />
    </AppLayout>
  )
}
