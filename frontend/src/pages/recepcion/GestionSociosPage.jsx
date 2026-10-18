import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  UserPlus,
  Eye,
  Check,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import SearchBar from '../../components/ui/SearchBar'
import FilterPanel from '../../components/ui/FilterPanel'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import SocioDetailModal from '../../components/admin/SocioDetailModal'
import { getSocioColumns } from '../../components/admin/SocioColumns'
import { useSociosList, useSocioMutations } from '../../hooks/queries/useSociosData'
import { usePlanesQuery } from '../../hooks/queries/usePlanesAdmin'
import { cobrarManual } from '../../services/pagosService'
import { MEDIO_MANUAL_OPTIONS } from '../../constants/pagos'
import { validateDni, validateTelefono, validateEmail } from '../../utils/validation'

// ─── Alta en Recepción form component ────────────────────────────────────────

function AltaRecepcionForm({ onSuccess, onCancel }) {
  const navigate = useNavigate()
  const { data: planesData, isLoading: planesLoading } = usePlanesQuery()
  const planes = Array.isArray(planesData)
    ? planesData.filter((p) => p.activo !== false)
    : []

  const { create } = useSocioMutations()

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    observaciones: '',
    plan_id: '',
    monto: '',
    medio: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  // Partial failure state: socio created but cobro failed
  const [partialFailure, setPartialFailure] = useState(null) // { socio, errorMsg }

  // When plan changes, prefill monto from plan.precio
  const handlePlanChange = (planId) => {
    const plan = planes.find((p) => String(p.id) === String(planId))
    setForm((prev) => ({
      ...prev,
      plan_id: planId,
      monto: plan ? String(plan.precio ?? '') : '',
    }))
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio.'
    if (!form.apellido.trim()) errs.apellido = 'El apellido es obligatorio.'
    const dniErr = validateDni(form.dni.trim())
    if (dniErr) errs.dni = dniErr
    const telErr = validateTelefono(form.telefono.trim())
    if (telErr) errs.telefono = telErr
    if (form.email.trim()) {
      const emailErr = validateEmail(form.email.trim())
      if (emailErr) errs.email = emailErr
    }
    if (!form.plan_id) errs.plan_id = 'Seleccioná un plan.'
    if (!form.monto || isNaN(Number(form.monto))) errs.monto = 'El monto debe ser un número válido.'
    if (!form.medio) errs.medio = 'Seleccioná el medio de pago.'
    return errs
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setPartialFailure(null)

    // Call 1: Create socio
    let socio
    try {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni.trim(),
        telefono: form.telefono.trim(),
      }
      if (form.email.trim()) payload.email = form.email.trim()
      if (form.observaciones.trim()) payload.observaciones = form.observaciones.trim()

      socio = await create.mutateAsync(payload)
    } catch (err) {
      // Call 1 failed — show inline error (mutations already show toast)
      setSubmitting(false)
      return
    }

    // Call 2: Cobro manual
    try {
      await cobrarManual({
        socio_id: socio.id,
        plan_id: Number(form.plan_id),
        monto: Number(form.monto),
        medio: form.medio,
      })
      // Full success
      onSuccess?.()
      navigate('/recepcion/socios')
    } catch (cobrarErr) {
      // Partial failure: socio created but cobro failed
      const data = cobrarErr?.response?.data
      const errorMsg =
        (data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : data?.detail) ||
        'No se pudo registrar el cobro.'
      setPartialFailure({ socio, errorMsg })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (field) =>
    `w-full px-3 py-2 rounded-xl text-sm bg-bg-raised border ${
      errors[field] ? 'border-error-500' : 'border-subtle'
    } text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors`

  if (partialFailure) {
    return (
      <div
        className="max-w-lg mx-auto flex flex-col gap-4 p-6 rounded-2xl bg-bg-surface border border-error-500/40"
        data-testid="partial-failure-card"
      >
        <div className="flex items-center gap-3 text-error-500">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <h3 className="font-semibold text-base">Socio creado, pero el cobro falló</h3>
        </div>
        <div className="text-sm text-text-secondary flex flex-col gap-1">
          <p>
            El socio{' '}
            <strong className="text-text-primary">
              {partialFailure.socio.nombre} {partialFailure.socio.apellido}
            </strong>{' '}
            fue creado con el número{' '}
            <strong className="text-text-primary">{partialFailure.socio.numero_socio}</strong>.
          </p>
          {partialFailure.socio.email && (
            <p>Email: {partialFailure.socio.email}</p>
          )}
          <p className="text-error-500 mt-1">{partialFailure.errorMsg}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => navigate(`/recepcion/cobros?socio_id=${partialFailure.socio.id}`)}
          >
            <ArrowRight className="w-4 h-4" />
            Ir a Cobros Manuales
          </Button>
          <Button
            variant="ghost"
            className="gap-2"
            onClick={async () => {
              setSubmitting(true)
              try {
                await cobrarManual({
                  socio_id: partialFailure.socio.id,
                  plan_id: Number(form.plan_id),
                  monto: Number(form.monto),
                  medio: form.medio,
                })
                onSuccess?.()
                navigate('/recepcion/socios')
              } catch (err) {
                const data = err?.response?.data
                const msg =
                  (data && typeof data === 'object'
                    ? Object.values(data).flat().join(' ')
                    : data?.detail) ||
                  'No se pudo registrar el cobro.'
                setPartialFailure((prev) => ({ ...prev, errorMsg: msg }))
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={submitting}
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar cobro
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl flex flex-col gap-5" noValidate>
      <h3 className="text-base font-semibold text-text-primary">Datos del socio</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Nombre <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            placeholder="Ej. Ana"
            className={inputClass('nombre')}
          />
          {errors.nombre && <p className="text-xs text-error-500 mt-1">{errors.nombre}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Apellido <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            value={form.apellido}
            onChange={(e) => handleChange('apellido', e.target.value)}
            placeholder="Ej. González"
            className={inputClass('apellido')}
          />
          {errors.apellido && <p className="text-xs text-error-500 mt-1">{errors.apellido}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            DNI <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            value={form.dni}
            onChange={(e) => handleChange('dni', e.target.value.replace(/\D/g, ''))}
            placeholder="Ej. 38450123"
            maxLength={8}
            className={inputClass('dni')}
            data-testid="dni-input"
          />
          {errors.dni && <p className="text-xs text-error-500 mt-1">{errors.dni}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Teléfono <span className="text-error-500">*</span>
          </label>
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            placeholder="+54 9 351 1234567"
            className={inputClass('telefono')}
            data-testid="telefono-input"
          />
          {errors.telefono && <p className="text-xs text-error-500 mt-1">{errors.telefono}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Email (opcional)
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="ana@mail.com"
            className={inputClass('email')}
            data-testid="email-input"
          />
          {errors.email && <p className="text-xs text-error-500 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Observaciones (opcional)
          </label>
          <input
            type="text"
            value={form.observaciones}
            onChange={(e) => handleChange('observaciones', e.target.value)}
            placeholder="Notas internas..."
            className={inputClass('observaciones')}
          />
        </div>
      </div>

      <h3 className="text-base font-semibold text-text-primary mt-2">Plan y cobro</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Plan <span className="text-error-500">*</span>
          </label>
          <select
            value={form.plan_id}
            onChange={(e) => handlePlanChange(e.target.value)}
            className={inputClass('plan_id')}
            data-testid="plan-select"
            disabled={planesLoading}
          >
            <option value="">
              {planesLoading ? 'Cargando planes...' : 'Seleccioná un plan'}
            </option>
            {planes.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre} — ${plan.precio}/mes
              </option>
            ))}
          </select>
          {errors.plan_id && <p className="text-xs text-error-500 mt-1">{errors.plan_id}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Monto a cobrar <span className="text-error-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={form.monto}
            onChange={(e) => handleChange('monto', e.target.value)}
            placeholder="0.00"
            className={inputClass('monto')}
            data-testid="monto-input"
          />
          {errors.monto && <p className="text-xs text-error-500 mt-1">{errors.monto}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Medio de pago <span className="text-error-500">*</span>
          </label>
          <select
            value={form.medio}
            onChange={(e) => handleChange('medio', e.target.value)}
            className={inputClass('medio')}
            data-testid="medio-select"
          >
            <option value="">Seleccioná un medio</option>
            {MEDIO_MANUAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.medio && <p className="text-xs text-error-500 mt-1">{errors.medio}</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          className="gap-2"
          data-testid="submit-alta"
        >
          <Check className="w-4 h-4" />
          Crear socio y cobrar
        </Button>
      </div>
    </form>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

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
          activeTab === 'nuevo' ? null : (
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
            <AltaRecepcionForm
              onSuccess={() => setActiveTab('listado')}
              onCancel={() => setActiveTab('listado')}
            />
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
