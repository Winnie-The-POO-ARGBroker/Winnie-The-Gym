import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Search, CreditCard, User, FileText, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import HistorialPagosCard from '../../components/pagos/HistorialPagosCard'
import api from '../../services/api'
import useDebounce from '../../hooks/useDebounce'
import { usePlanesQuery } from '../../hooks/queries/usePlanesAdmin'
import { useCobrarManualMutation } from '../../hooks/queries/usePagos'
import { useMembresiaActivaDeSocio } from '../../hooks/queries/useMembresias'
import { descargarComprobante } from '../../services/pagosService'
import { MEDIO_MANUAL_OPTIONS } from '../../constants/pagos'

const MEDIO_OPTIONS = [
  { value: '', label: '— Seleccioná un medio —' },
  ...MEDIO_MANUAL_OPTIONS,
]

// ─── Comprobante ───────────────────────────────────────────────────────────────

function Comprobante({ pago, onNuevoCobro }) {
  const [descargando, setDescargando] = useState(false)

  const handleDescargar = async () => {
    setDescargando(true)
    try {
      await descargarComprobante(pago.id)
    } catch {
      toast.error('No se pudo descargar el comprobante.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Card className="p-5 flex flex-col gap-4 border-success-500/30 bg-success-500/5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-success-500" />
        <h2 className="text-sm font-bold text-success-500 uppercase tracking-wide">
          Cobro registrado exitosamente
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'N° Pago', value: `#${pago.id}` },
          { label: 'Socio', value: pago.socio_nombre ?? `#${pago.socio}` },
          { label: 'Plan', value: pago.plan_nombre ?? '—' },
          {
            label: 'Monto',
            value: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(pago.monto),
          },
          { label: 'Medio', value: pago.medio_manual ?? pago.metodo ?? '—' },
          {
            label: 'Fecha',
            value: new Date(pago.created_at ?? pago.paid_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
          },
          { label: 'Cobrado por', value: pago.cobrado_por_nombre ?? '—' },
          { label: 'Estado', value: pago.estado ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="p-2.5 rounded-lg bg-bg-raised border border-subtle">
            <span className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-0.5">
              {label}
            </span>
            <span className="text-sm font-medium text-text-primary">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button variant="secondary" onClick={onNuevoCobro} className="self-start">
          Registrar otro cobro
        </Button>
        {pago.estado === 'aprobado' && (
          <Button
            variant="secondary"
            onClick={handleDescargar}
            loading={descargando}
            className="self-start gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar comprobante
          </Button>
        )}
      </div>
    </Card>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CobroManualPage() {
  // ── Búsqueda de socio ──
  const [busqueda, setBusqueda] = useState('')
  const debouncedBusqueda = useDebounce(busqueda)
  const [socios, setSocios] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [socioSeleccionado, setSocioSeleccionado] = useState(null)
  const [activoIdx, setActivoIdx] = useState(-1)

  // ── Formulario ──
  const [planId, setPlanId] = useState('')
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState('')
  const [observacion, setObservacion] = useState('')
  const [motivo, setMotivo] = useState('')

  // ── Comprobante ──
  const [comprobante, setComprobante] = useState(null)

  // Idempotency key — regenerated per submit attempt
  const idempotencyKeyRef = useRef(crypto.randomUUID())

  const inputRef = useRef(null)

  const { data: allPlanes = [] } = usePlanesQuery()
  const planes = allPlanes.filter((p) => p.activo)

  const cobrarManual = useCobrarManualMutation()
  const guardando = cobrarManual.isPending

  const { data: membresiaActiva } = useMembresiaActivaDeSocio(socioSeleccionado?.id ?? null)

  const planActual = planes.find((p) => String(p.id) === String(planId))

  const prevPlanRef = useRef(planId)
  if (prevPlanRef.current !== planId) {
    prevPlanRef.current = planId
    if (planActual) setMonto(String(planActual.precio))
  }

  const montoDistinto = planActual && monto && Number(monto) !== Number(planActual.precio)

  // ── Socio search ──
  useEffect(() => {
    if (!debouncedBusqueda.trim()) {
      setSocios([])
      return
    }
    const controller = new AbortController()
    setBuscando(true)
    setActivoIdx(-1)
    api.get('/members/socios/', {
      params: { search: debouncedBusqueda, page_size: 6 },
      signal: controller.signal,
    })
      .then((res) => {
        setSocios(res.data.results ?? res.data)
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError' || err?.name === 'CanceledError') return
        setSocios([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setBuscando(false)
      })
    return () => controller.abort()
  }, [debouncedBusqueda])

  const seleccionarSocio = useCallback((socio) => {
    setSocioSeleccionado(socio)
    setSocios([])
    setActivoIdx(-1)
    setBusqueda(`${socio.nombre} ${socio.apellido} — DNI ${socio.dni}`)
  }, [])

  const limpiarSocio = useCallback(() => {
    setSocioSeleccionado(null)
    setBusqueda('')
    setSocios([])
    setActivoIdx(-1)
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (socios.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivoIdx((prev) => Math.min(prev + 1, socios.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivoIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activoIdx >= 0 && socios[activoIdx]) seleccionarSocio(socios[activoIdx])
    } else if (e.key === 'Escape') {
      setSocios([])
      setActivoIdx(-1)
    }
  }, [socios, activoIdx, seleccionarSocio])

  const resetForm = useCallback(() => {
    setPlanId('')
    setMonto('')
    setMedio('')
    setObservacion('')
    setMotivo('')
    limpiarSocio()
    idempotencyKeyRef.current = crypto.randomUUID()
  }, [limpiarSocio])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (!socioSeleccionado) return toast.error('Seleccioná un socio')
    if (!planId) return toast.error('Seleccioná un plan')
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) return toast.error('Ingresá un monto válido')
    if (!medio) return toast.error('Seleccioná el medio de pago')
    if (montoDistinto && !motivo.trim()) return toast.error('Cuando el monto difiere del precio de lista, el motivo es obligatorio')

    cobrarManual.mutate(
      {
        socio_id: socioSeleccionado.id,
        plan_id: Number(planId),
        monto: Number(monto),
        medio,
        observacion,
        motivo: motivo || undefined,
        idempotency_key: idempotencyKeyRef.current,
      },
      {
        onSuccess: (pagoCreado) => {
          // Include socio name in comprobante since API may not return it
          setComprobante({
            ...pagoCreado,
            socio_nombre: pagoCreado.socio_nombre
              ?? `${socioSeleccionado.nombre} ${socioSeleccionado.apellido}`,
          })
          // Regenerate key for next payment
          idempotencyKeyRef.current = crypto.randomUUID()
          toast.success(`Cobro registrado: $${Number(monto).toLocaleString('es-AR')} — ${socioSeleccionado.nombre} ${socioSeleccionado.apellido}`)
        },
      }
    )
  }, [socioSeleccionado, planId, monto, medio, observacion, motivo, montoDistinto, cobrarManual])

  const listboxId = 'busqueda-socio-listbox'
  const dropdownAbierto = socios.length > 0 && !socioSeleccionado

  // ── If comprobante available, show receipt ──
  if (comprobante) {
    return (
      <AppLayout>
        <TopBar
          title="Cobro manual"
          subtitle="Registrá pagos en efectivo u otros medios fuera de MercadoPago"
        />
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-2xl mx-auto">
            <Comprobante pago={comprobante} onNuevoCobro={() => { setComprobante(null); resetForm() }} />
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <TopBar
        title="Cobro manual"
        subtitle="Registrá pagos en efectivo u otros medios fuera de MercadoPago"
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">

          {/* ── Panel principal ── */}
          <div className="flex-1 flex flex-col gap-6">

            {/* Búsqueda de socio */}
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">Socio</h2>
              </div>

              <div className="relative">
                <Input
                  ref={inputRef}
                  id="busqueda-socio"
                  label="Buscar por nombre, apellido o DNI"
                  icon={Search}
                  placeholder="Ej: Juan García o 30123456"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value)
                    if (socioSeleccionado) setSocioSeleccionado(null)
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={dropdownAbierto}
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={activoIdx >= 0 ? `busqueda-socio-opt-${activoIdx}` : undefined}
                />
                {buscando && (
                  <p className="text-[11px] text-text-tertiary mt-1 pl-1">Buscando...</p>
                )}

                {dropdownAbierto && (
                  <ul
                    id={listboxId}
                    role="listbox"
                    aria-label="Resultados de búsqueda de socios"
                    className="absolute z-20 w-full mt-1 bg-bg-surface border border-subtle rounded-xl shadow-lg overflow-hidden"
                  >
                    {socios.map((s, idx) => (
                      <li key={s.id} id={`busqueda-socio-opt-${idx}`} role="option" aria-selected={idx === activoIdx}>
                        <button
                          type="button"
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            idx === activoIdx ? 'bg-bg-raised text-text-primary' : 'hover:bg-bg-raised'
                          }`}
                          onClick={() => seleccionarSocio(s)}
                          onMouseEnter={() => setActivoIdx(idx)}
                        >
                          <span className="font-medium text-text-primary">{s.nombre} {s.apellido}</span>
                          <span className="text-text-tertiary text-xs ml-2">DNI {s.dni} · #{s.numero_socio}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {socioSeleccionado && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-raised border border-subtle">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {socioSeleccionado.nombre} {socioSeleccionado.apellido}
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      DNI {socioSeleccionado.dni} · Socio #{socioSeleccionado.numero_socio}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={limpiarSocio}
                    className="text-xs text-text-tertiary hover:text-text-primary transition-colors px-2"
                  >
                    Cambiar
                  </button>
                </div>
              )}

              {socioSeleccionado && membresiaActiva && (
                <div
                  role="alert"
                  className="flex items-start gap-3 p-3 rounded-lg border bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-300"
                  data-testid="membresia-activa-warning"
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed">
                    <span className="font-semibold">Este socio ya tiene una membresía activa</span>
                    {membresiaActiva.fecha_fin && (
                      <> hasta el <span className="font-semibold">{new Date(membresiaActiva.fecha_fin).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></>
                    )}
                    . El cobro extenderá desde esa fecha.
                    {membresiaActiva.fecha_fin && planActual?.duracion_dias && (() => {
                      const base = new Date(membresiaActiva.fecha_fin)
                      base.setDate(base.getDate() + planActual.duracion_dias)
                      return (
                        <> Nueva vencimiento estimado:{' '}
                          <span className="font-semibold">
                            {base.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        </>
                      )
                    })()}
                  </p>
                </div>
              )}
            </Card>

            {/* Plan, monto y medio */}
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">Plan, monto y medio de pago</h2>
              </div>

              {/* Plan */}
              <div>
                <label
                  htmlFor="select-plan"
                  className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
                >
                  Plan
                </label>
                <div className="relative">
                  <select
                    id="select-plan"
                    className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary py-2.5 px-3 appearance-none"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                  >
                    <option value="">— Seleccioná un plan —</option>
                    {planes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} · ${Number(p.precio).toLocaleString('es-AR')} / {p.duracion_dias} días
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="h-4 w-4 text-text-tertiary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Monto */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="campo-monto"
                  label="Monto cobrado (ARS)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Ej: 12000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
                {planActual && (
                  <div className="flex flex-col justify-end">
                    <p className="text-[10px] text-text-tertiary mb-1">Precio de lista</p>
                    <p className="text-sm font-semibold text-text-primary">
                      ${Number(planActual.precio).toLocaleString('es-AR')}
                    </p>
                    {montoDistinto && (
                      <p className="text-[10px] text-warning-500 mt-0.5">
                        Diferencia: ${(Number(monto) - Number(planActual.precio)).toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Medio de pago — obligatorio */}
              <div>
                <label
                  htmlFor="select-medio"
                  className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
                >
                  Medio de pago <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="select-medio"
                    data-testid="select-medio"
                    className={`w-full bg-bg-base border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary py-2.5 px-3 appearance-none ${
                      !medio ? 'border-error-500/50' : 'border-subtle'
                    }`}
                    value={medio}
                    onChange={(e) => setMedio(e.target.value)}
                  >
                    {MEDIO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="h-4 w-4 text-text-tertiary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
                {!medio && (
                  <p className="text-[11px] text-error-500 mt-1">Campo obligatorio</p>
                )}
              </div>

              {/* Warning monto != precio → motivo obligatorio */}
              {montoDistinto && (
                <div
                  role="alert"
                  className="flex flex-col gap-2 p-3 rounded-lg border bg-warning-500/10 border-warning-500/30"
                  data-testid="monto-distinto-warning"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-warning-500">
                      El monto difiere del precio de lista. Ingresá un motivo (obligatorio).
                    </p>
                  </div>
                  <textarea
                    id="campo-motivo"
                    data-testid="campo-motivo"
                    rows={2}
                    maxLength={200}
                    placeholder="Ej: Descuento especial por convenio"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors py-2 px-3 text-sm resize-none"
                  />
                </div>
              )}
            </Card>

            {/* Observación */}
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">Observación (opcional)</h2>
              </div>
              <textarea
                id="campo-observacion"
                className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors py-2.5 px-3 text-sm resize-none"
                rows={3}
                maxLength={200}
                placeholder="Ej: Pago en efectivo por descuento especial"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
              />
              <p className="text-[10px] text-text-tertiary text-right">{observacion.length}/200</p>
            </Card>

            {/* Acción */}
            <Button
              id="btn-registrar-cobro"
              variant="primary"
              size="lg"
              loading={guardando}
              onClick={handleSubmit}
              className="w-full gap-2 shadow-md shadow-primary/20"
            >
              <CreditCard className="w-4 h-4" />
              Registrar cobro y activar membresía
            </Button>
          </div>

          {/* ── Sidebar: historial ── */}
          <div className="lg:w-72 shrink-0">
            <div className="sticky top-6 flex flex-col gap-4">
              <HistorialPagosCard
                socioId={socioSeleccionado?.id ?? null}
                limit={8}
                staffOnly
              />
              {!socioSeleccionado && (
                <EmptyState
                  icon={User}
                  title="Sin socio seleccionado"
                  message="Seleccioná un socio para ver su historial de pagos"
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
