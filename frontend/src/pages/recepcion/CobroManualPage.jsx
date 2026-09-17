import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Search, CreditCard, User, FileText } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import HistorialPagosCard from '../../components/pagos/HistorialPagosCard'
import api from '../../services/api'
import { cobrarManual } from '../../services/pagosService'
import useDebounce from '../../hooks/useDebounce'

export default function CobroManualPage() {
  // ── Búsqueda de socio ──
  const [busqueda, setBusqueda] = useState('')
  const debouncedBusqueda = useDebounce(busqueda)
  const [socios, setSocios] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [socioSeleccionado, setSocioSeleccionado] = useState(null)
  // índice del item con foco de teclado en el listbox
  const [activoIdx, setActivoIdx] = useState(-1)

  // ── Planes ──
  const [planes, setPlanes] = useState([])
  const [planId, setPlanId] = useState('')

  // ── Formulario ──
  const [monto, setMonto] = useState('')
  const [observacion, setObservacion] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Ref al input de búsqueda para devolver el foco después de seleccionar con teclado
  const inputRef = useRef(null)

  // Cargar planes al montar
  useEffect(() => {
    api.get('/memberships/planes/', { params: { activo: true } })
      .then((res) => {
        const data = res.data.results ?? res.data
        const activos = data.filter((p) => p.activo)
        setPlanes(activos)
      })
      .catch(() => toast.error('No se pudieron cargar los planes'))
  }, [])

  // Prefill monto cuando cambia el plan seleccionado
  useEffect(() => {
    const plan = planes.find((p) => String(p.id) === String(planId))
    if (plan) setMonto(String(plan.precio))
  }, [planId, planes])

  // Búsqueda de socios con debounce + AbortController
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
        // Ignorar errores de abort (request cancelada intencionalmente)
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

  // Navegación de teclado en el autocomplete (ARIA pattern: listbox)
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
      if (activoIdx >= 0 && socios[activoIdx]) {
        seleccionarSocio(socios[activoIdx])
      }
    } else if (e.key === 'Escape') {
      setSocios([])
      setActivoIdx(-1)
    }
  }, [socios, activoIdx, seleccionarSocio])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!socioSeleccionado) return toast.error('Seleccioná un socio')
    if (!planId) return toast.error('Seleccioná un plan')
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) return toast.error('Ingresá un monto válido')

    setGuardando(true)
    try {
      await cobrarManual({
        socio_id: socioSeleccionado.id,
        plan_id: Number(planId),
        monto: Number(monto),
        observacion,
      })
      toast.success(`Cobro registrado: $${Number(monto).toLocaleString('es-AR')} — ${socioSeleccionado.nombre} ${socioSeleccionado.apellido}`)
      // Limpiar formulario
      setPlanId('')
      setMonto('')
      setObservacion('')
      limpiarSocio()
    } catch (err) {
      const detalle = err?.response?.data?.detail ?? 'Error al registrar el cobro'
      toast.error(detalle)
    } finally {
      setGuardando(false)
    }
  }, [socioSeleccionado, planId, monto, observacion, limpiarSocio])

  const planActual = planes.find((p) => String(p.id) === String(planId))

  const listboxId = 'busqueda-socio-listbox'
  const dropdownAbierto = socios.length > 0 && !socioSeleccionado

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
                {/* Input con atributos ARIA para el pattern combobox */}
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
                  aria-activedescendant={
                    activoIdx >= 0 ? `busqueda-socio-opt-${activoIdx}` : undefined
                  }
                />
                {buscando && (
                  <p className="text-[11px] text-text-tertiary mt-1 pl-1">Buscando...</p>
                )}

                {/* Dropdown de resultados — listbox ARIA */}
                {dropdownAbierto && (
                  <ul
                    id={listboxId}
                    role="listbox"
                    aria-label="Resultados de búsqueda de socios"
                    className="absolute z-20 w-full mt-1 bg-bg-surface border border-subtle rounded-xl shadow-lg overflow-hidden"
                  >
                    {socios.map((s, idx) => (
                      <li
                        key={s.id}
                        id={`busqueda-socio-opt-${idx}`}
                        role="option"
                        aria-selected={idx === activoIdx}
                      >
                        <button
                          type="button"
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            idx === activoIdx
                              ? 'bg-bg-raised text-text-primary'
                              : 'hover:bg-bg-raised'
                          }`}
                          onClick={() => seleccionarSocio(s)}
                          onMouseEnter={() => setActivoIdx(idx)}
                        >
                          <span className="font-medium text-text-primary">
                            {s.nombre} {s.apellido}
                          </span>
                          <span className="text-text-tertiary text-xs ml-2">
                            DNI {s.dni} · #{s.numero_socio}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Chip del socio seleccionado */}
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
            </Card>

            {/* Plan y monto */}
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">Plan y monto</h2>
              </div>

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
                    {monto && Number(monto) !== Number(planActual.precio) && (
                      <p className="text-[10px] text-warning-500 mt-0.5">
                        Diferencia: ${(Number(monto) - Number(planActual.precio)).toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>
                )}
              </div>
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
