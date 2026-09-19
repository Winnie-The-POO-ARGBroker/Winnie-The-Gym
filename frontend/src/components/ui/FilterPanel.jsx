import { useState } from 'react'
import { Filter, ChevronDown, X } from 'lucide-react'

/**
 * Panel de filtros colapsable para el listado de socios.
 *
 * @param {Object}   props
 * @param {Object}   props.filters  - Estado actual de los filtros { estado, con_certificado }
 * @param {function} props.onChange  - Callback (key, value)
 * @param {function} props.onClear  - Callback para limpiar todos los filtros
 */
export default function FilterPanel({ filters, onChange, onClear }) {
  const [open, setOpen] = useState(false)

  const activeCount = Object.values(filters).filter(
    (v) => v !== '' && v !== null && v !== undefined,
  ).length

  return (
    <div className="relative">
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
          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-primary text-white rounded-full">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Panel desplegable */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-30 w-80 bg-bg-surface border border-subtle rounded-xl shadow-xl p-4 space-y-4">
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
                      ? 'bg-primary text-white shadow-sm'
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
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-bg-raised text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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
