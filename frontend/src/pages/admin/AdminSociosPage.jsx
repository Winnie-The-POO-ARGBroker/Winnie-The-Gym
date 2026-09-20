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
  AlertTriangle,
} from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import SearchBar from '../../components/ui/SearchBar'
import FilterPanel from '../../components/ui/FilterPanel'
import Modal from '../../components/ui/Modal'
import SocioFormModal from '../../components/admin/SocioFormModal'
import SocioDetailModal from '../../components/admin/SocioDetailModal'
import { getSocioColumns } from '../../components/admin/SocioColumns'
import { useSociosList, useSociosStats, useSocioMutations } from '../../hooks/queries/useSociosData'

export default function AdminSociosPage() {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ estado: '', con_certificado: '' })
  const [ordering, setOrdering] = useState('-created_at')
  const [socioABajar, setSocioABajar] = useState(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [socioToEdit, setSocioToEdit] = useState(null)
  const [socioParaDetalle, setSocioParaDetalle] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Query paginada de socios
  const { data, isLoading } = useSociosList({
    page,
    pageSize,
    search,
    estado: filters.estado,
    con_certificado: filters.con_certificado,
    ordering,
  })

  // Query de estadísticas globales reales del backend
  const { data: stats, isLoading: isStatsLoading } = useSociosStats()

  const { create, patch, baja, certificado } = useSocioMutations()

  const socios = data?.results || (Array.isArray(data) ? data : [])
  const totalCount = data?.count ?? socios.length

  // Manejadores
  const handleSearch = (term) => {
    setSearch(term)
    setPage(1)
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters({ estado: '', con_certificado: '' })
    setPage(1)
  }

  const handleAbrirNuevo = () => {
    setSocioToEdit(null)
    setIsFormModalOpen(true)
  }

  const handleAbrirEditar = (socio) => {
    setSocioToEdit(socio)
    setIsFormModalOpen(true)
  }

  const handleVerDetalle = (socio) => {
    setSocioParaDetalle(socio)
    setIsDetailModalOpen(true)
  }

  const handleSaveSocio = async (formData, certificadoFile) => {
    try {
      let socioId = formData.id
      if (socioId) {
        // Omitir id del cuerpo de PATCH para mantener contrato limpio con DRF
        const { id: _id, ...dataToPatch } = formData
        await patch.mutateAsync({ id: socioId, data: dataToPatch })
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
    } catch {
      // El toast con el error específico ya lo muestra onError del hook.
      // Dejamos el modal abierto para que el usuario pueda corregir los datos.
    }
  }

  const handleConfirmarBaja = async () => {
    if (!socioABajar) return
    try {
      await baja.mutateAsync(socioABajar.id)
      setSocioABajar(null)
    } catch {
      // El toast ya lo gestiona el onError de la mutación
    }
  }

  const columns = getSocioColumns()

  return (
    <AppLayout>
      <TopBar
        title="Gestión de Socios"
        subtitle="Administra la membresía, aptos físicos y estado de los socios"
        rightContent={
          <Button
            variant="primary"
            onClick={handleAbrirNuevo}
            className="gap-2 shadow-md shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> Nuevo Socio
          </Button>
        }
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        {/* KPI Cards con estadísticas globales reales del backend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-bg-surface border border-subtle flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Socios</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {isStatsLoading ? '...' : (stats?.total ?? totalCount)}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bg-surface border border-subtle flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-success-500/10 flex items-center justify-center text-success-500">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Socios Activos</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {isStatsLoading ? '...' : (stats?.activos ?? 0)}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bg-surface border border-subtle flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-info-500/10 flex items-center justify-center text-info-500">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Con Certificado</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {isStatsLoading ? '...' : (stats?.con_certificado ?? 0)}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bg-surface border border-subtle flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-error-500/10 flex items-center justify-center text-error-500">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Socios de Baja</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {isStatsLoading ? '...' : (stats?.bajas ?? 0)}
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
            />
          </div>

          <FilterPanel
            filters={filters}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        </div>

        {/* Tabla de socios con paginación */}
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
            emptyMessage={
              search || filters.estado || filters.con_certificado
                ? 'No se encontraron socios que coincidan con la búsqueda o filtros.'
                : 'No hay socios registrados en el gimnasio todavía.'
            }
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
                  title="Ver detalle"
                  aria-label={`Ver detalle de ${row.nombre} ${row.apellido}`}
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAbrirEditar(row)
                  }}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-orange-500 hover:bg-bg-raised transition-colors"
                  title="Editar socio"
                  aria-label={`Editar socio ${row.nombre} ${row.apellido}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {row.estado !== 'baja' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSocioABajar(row)
                    }}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-error-500 hover:bg-bg-raised transition-colors"
                    title="Dar de baja socio"
                    aria-label={`Dar de baja a ${row.nombre} ${row.apellido}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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

      {/* Modal de confirmación accesible para dar de baja */}
      <Modal
        isOpen={!!socioABajar}
        onClose={() => setSocioABajar(null)}
        maxWidth="max-w-md"
        title="Dar de baja socio"
        description='Esta acción cambiará el estado del socio a "baja".'
        icon={<AlertTriangle className="w-5 h-5 text-error-500" />}
      >
        <p className="text-sm text-text-secondary mb-4">
          ¿Estás seguro de que deseas dar de baja al socio{' '}
          <strong className="text-text-primary">
            {socioABajar?.nombre} {socioABajar?.apellido}
          </strong>{' '}
          (DNI: {socioABajar?.dni})?
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
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
      </Modal>

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

      {/* Modal de visualización de detalle */}
      <SocioDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSocioParaDetalle(null)
        }}
        socio={socioParaDetalle}
        onEditar={(socio) => {
          setIsDetailModalOpen(false)
          setSocioParaDetalle(null)
          handleAbrirEditar(socio)
        }}
      />
    </AppLayout>
  )
}
