import { useState } from 'react'
import { Filter, ChevronDown, X } from 'lucide-react'

/**
 * Panel de filtros colapsable para el listado de socios.
 *
 * @param {Object}   props
 * @param {Object}   props.filters  - Estado actual de los filtros { estado, con_certificado, apto_estado? }
 * @param {function} props.onChange  - Callback (key, value)
 * @param {function} props.onClear  - Callback para limpiar todos los filtros
 * @param {'left'|'right'} [props.align='left'] - Align the dropdown to the left or right of the toggle
 * @param {boolean}  [props.showAptoEstado=false] - Whether to show the apto_estado filter section
 */
export default function FilterPanel({ filters, onChange, onClear, align = 'left', showAptoEstado = false }) {
  const [open, setOpen] = useState(false)

  const activeCount = Object.values(filters).filter(
    (v) => v !== '' && v !== null && v !== undefined,
  ).length

  return (
    <div className="relative max-w-full">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
          activeCount > 0
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-subtle bg-bg-base text-text-secondary hover:bg-bg-raised hover:text-text-primary'
        }`}
      >
        <Filter className="w-4 h-4" />
        Filtros
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-orange-700 text-white rounded-full">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Panel desplegable */}
      {open && (
        <div
          className={`absolute top-full mt-2 z-30 w-80 max-w-[calc(100vw-2rem)] overflow-x-auto bg-bg-surface border border-subtle rounded-xl shadow-xl p-4 space-y-4 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Estado
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: '', label: 'Todos' },
                { value: 'activo', label: 'Activo' },
                { value: 'suspendido', label: 'Suspendido' },
                { value: 'baja', label: 'Baja' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange('estado', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    (filters.estado || '') === opt.value
                      ? 'bg-orange-700 text-white shadow-sm'
                      : 'bg-bg-raised text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Certificado médico */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Certificado médico
            </label>
            <div className="flex gap-2">
              {[
                { value: '', label: 'Todos' },
                { value: 'true', label: 'Con certificado' },
                { value: 'false', label: 'Sin certificado' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange('con_certificado', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    (filters.con_certificado || '') === opt.value
                      ? 'bg-orange-700 text-white shadow-sm'
                      : 'bg-bg-raised text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Apto estado — shown only when explicitly enabled by the caller */}
          {showAptoEstado && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Estado del apto médico
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: '', label: 'Todos' },
                  { value: 'sin_apto', label: 'Sin apto' },
                  { value: 'vigente', label: 'Vigente' },
                  { value: 'por_vencer', label: 'Por vencer' },
                  { value: 'vencido', label: 'Vencido' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange('apto_estado', opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      (filters.apto_estado || '') === opt.value
                        ? 'bg-orange-700 text-white shadow-sm'
                        : 'bg-bg-raised text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Limpiar */}
          {activeCount > 0 && (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1.5 text-xs text-error-500 hover:text-error-400 transition-colors font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Backdrop invisible para cerrar */}
      {open && (
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}
