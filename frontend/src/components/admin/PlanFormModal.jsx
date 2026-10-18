import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, Sparkles, GripVertical, Clock } from 'lucide-react'
import { z } from 'zod'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { normalizarBeneficios } from '../../utils/beneficios'

const DIAS_SEMANA = [
  { key: 'lun', label: 'Lun' },
  { key: 'mar', label: 'Mar' },
  { key: 'mie', label: 'Mié' },
  { key: 'jue', label: 'Jue' },
  { key: 'vie', label: 'Vie' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
]

const planSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  precio: z.coerce.number({ invalid_type_error: 'El precio debe ser un número' }).min(0, 'El precio no puede ser negativo'),
  duracion_dias: z.coerce
    .number({ invalid_type_error: 'La duración debe ser un número' })
    .int('La duración debe ser un número entero')
    .min(30, 'La duración debe estar entre 30 y 365 días')
    .max(365, 'La duración debe estar entre 30 y 365 días'),
})

/**
 * Converts a matriz_comparativa object (key→value) to an editable array of pairs.
 */
function matrizToRows(obj) {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }))
}

function rowsToMatriz(rows) {
  const result = {}
  for (const { key, value } of rows) {
    if (key.trim()) result[key.trim()] = value
  }
  return result
}

export default function PlanFormModal({ isOpen, onClose, onSave, planToEdit = null, isDuplicate = false }) {
  const [errors, setErrors] = useState({})
  const [matrizRows, setMatrizRows] = useState([])
  const [formData, setFormData] = useState({
    nombre: '',
    subtitulo: '',
    precio: '',
    duracion_dias: 30,
    clases_asignadas: 0,
    es_popular: false,
    activo: true,
    franja_desde: '',
    franja_hasta: '',
    dias_habilitados: null,
    beneficios: [
      { texto: 'Pase libre al gimnasio', incluido: true },
      { texto: 'Acceso a clases grupales', incluido: true },
      { texto: 'Seguimiento por entrenador', incluido: false },
    ],
    matriz_comparativa: {},
  })

  useEffect(() => {
    setErrors({})
    if (planToEdit) {
      const data = {
        ...planToEdit,
        nombre: isDuplicate ? `${planToEdit.nombre} (Copia)` : planToEdit.nombre,
        id: isDuplicate ? undefined : planToEdit.id,
        // The API returns plain strings; the form edits { texto, incluido } rows.
        beneficios: normalizarBeneficios(planToEdit.beneficios),
        matriz_comparativa: planToEdit.matriz_comparativa ?? {},
      }
      setFormData(data)
      setMatrizRows(matrizToRows(data.matriz_comparativa))
    } else {
      setFormData({
        nombre: '',
        subtitulo: '',
        precio: '',
        duracion_dias: 30,
        clases_asignadas: 0,
        es_popular: false,
        activo: true,
        franja_desde: '',
        franja_hasta: '',
        dias_habilitados: null,
        beneficios: [
          { texto: 'Pase libre al gimnasio', incluido: true },
          { texto: 'Acceso a clases grupales', incluido: true },
          { texto: 'Seguimiento por entrenador', incluido: false },
        ],
        matriz_comparativa: {},
      })
      setMatrizRows([])
    }
  }, [planToEdit, isDuplicate, isOpen])

  if (!isOpen) return null

  const handleBenefitChange = (index, field, value) => {
    const updated = [...formData.beneficios]
    updated[index] = { ...updated[index], [field]: value }
    setFormData((prev) => ({ ...prev, beneficios: updated }))
  }

  const addBenefit = () => {
    setFormData((prev) => ({
      ...prev,
      beneficios: [...prev.beneficios, { texto: '', incluido: true }],
    }))
  }

  const removeBenefit = (index) => {
    setFormData((prev) => ({
      ...prev,
      beneficios: prev.beneficios.filter((_, i) => i !== index),
    }))
  }

  const handleMatrizRowChange = (index, field, value) => {
    setMatrizRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addMatrizRow = () => {
    setMatrizRows((prev) => [...prev, { key: '', value: '' }])
  }

  const removeMatrizRow = (index) => {
    setMatrizRows((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleDia = (key) => {
    setFormData((prev) => {
      const current = prev.dias_habilitados ?? []
      const updated = current.includes(key) ? current.filter((d) => d !== key) : [...current, key]
      // null means "todos" — if all 7 are selected or none selected, reset to null
      return { ...prev, dias_habilitados: updated.length === 0 ? null : updated }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})

    const result = planSchema.safeParse({
      nombre: formData.nombre,
      precio: formData.precio,
      duracion_dias: formData.duracion_dias,
    })

    if (!result.success) {
      const fieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    // Validate beneficios max 10 items
    if ((formData.beneficios ?? []).length > 10) {
      setErrors({ beneficios: 'Máximo 10 beneficios permitidos' })
      return
    }

    const payload = {
      ...formData,
      precio: Number(formData.precio),
      clases_asignadas: Number(formData.clases_asignadas) || 0,
      duracion_dias: Number(formData.duracion_dias) || 30,
      socios_activos: formData.socios_activos || (isDuplicate ? 0 : 15),
      // Beneficios as list of strings (backend expects list of strings)
      beneficios: (formData.beneficios ?? [])
        .filter((b) => b.incluido && b.texto?.trim())
        .map((b) => b.texto.trim()),
      matriz_comparativa: rowsToMatriz(matrizRows),
      // Schedule restrictions — send null when empty so backend treats as "no restriction"
      franja_desde: formData.franja_desde || null,
      franja_hasta: formData.franja_hasta || null,
      dias_habilitados: formData.dias_habilitados ?? null,
    }

    // onSave is responsible for calling onClose() only on success (via AdminPlanesPage)
    onSave(payload)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDuplicate ? 'Duplicar Plan' : planToEdit ? 'Editar Plan de Membresía' : 'Crear Nuevo Plan'}
      description="Definí el precio, duración y beneficios comerciales de la membresía"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 -mx-6 -mb-6 mt-2">
        <div className="overflow-y-auto px-6 space-y-6 max-h-[60vh]">
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Nombre del plan *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Black, Funcional Plus..."
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                data-testid="plan-form-nombre"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base transition-colors ${errors.nombre ? 'border-error-500 focus:border-error-500' : 'border-subtle focus:border-orange-500'}`}
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-error-500">{errors.nombre}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Subtítulo / Tagline
              </label>
              <input
                type="text"
                placeholder="Ej. Pase libre, Más popular..."
                value={formData.subtitulo}
                onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Pricing & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Precio mensual ($ ARS) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="500"
                placeholder="12000"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                data-testid="plan-form-precio"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base transition-colors ${errors.precio ? 'border-error-500 focus:border-error-500' : 'border-subtle focus:border-orange-500'}`}
              />
              {errors.precio && (
                <p className="mt-1 text-xs text-error-500">{errors.precio}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Duración (días)
              </label>
              <select
                value={formData.duracion_dias}
                onChange={(e) => setFormData({ ...formData, duracion_dias: Number(e.target.value) })}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base transition-colors ${errors.duracion_dias ? 'border-error-500 focus:border-error-500' : 'border-subtle focus:border-orange-500'}`}
              >
                <option value={30}>30 días (Mensual)</option>
                <option value={90}>90 días (Trimestral)</option>
                <option value={180}>180 días (Semestral)</option>
                <option value={365}>365 días (Anual)</option>
              </select>
              {errors.duracion_dias && (
                <p className="mt-1 text-xs text-error-500">{errors.duracion_dias}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Clases asignadas
              </label>
              <select
                value={formData.clases_asignadas}
                onChange={(e) => setFormData({ ...formData, clases_asignadas: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
              >
                <option value={0}>0 (Sin clases)</option>
                <option value={8}>8 clases / mes</option>
                <option value={12}>12 clases / mes</option>
                <option value={999}>Ilimitadas</option>
              </select>
            </div>
          </div>

          {/* Access schedule (franja horaria) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Restricción de horario (opcional)
              </label>
            </div>
            <p className="text-xs text-text-tertiary mb-3">
              Dejá en blanco para permitir acceso en todo el horario del gimnasio.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Franja desde
                </label>
                <input
                  type="time"
                  data-testid="plan-form-franja-desde"
                  value={formData.franja_desde ?? ''}
                  onChange={(e) => setFormData({ ...formData, franja_desde: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Franja hasta
                </label>
                <input
                  type="time"
                  data-testid="plan-form-franja-hasta"
                  value={formData.franja_hasta ?? ''}
                  onChange={(e) => setFormData({ ...formData, franja_hasta: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
            {/* Days of week chips */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2">
                Días habilitados (vacío = todos los días)
              </label>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((d) => {
                  const active = (formData.dias_habilitados ?? []).includes(d.key)
                  return (
                    <button
                      key={d.key}
                      type="button"
                      data-testid={`dia-chip-${d.key}`}
                      onClick={() => toggleDia(d.key)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-bg-raised text-text-secondary border-subtle hover:border-orange-500/50'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Popular toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-raised/60 border border-subtle">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">Destacar como “POPULAR”</p>
                <p className="text-xs text-text-secondary">
                  Aparecerá con borde naranja brillante y etiqueta en el portal de membresías
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.es_popular}
                onChange={(e) => setFormData({ ...formData, es_popular: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-raised peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {/* Checklist de Beneficios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Beneficios de la tarjeta
              </label>
              <button
                type="button"
                onClick={addBenefit}
                className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar beneficio
              </button>
            </div>

            <div className="space-y-2">
              {formData.beneficios?.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBenefitChange(idx, 'incluido', !b.incluido)}
                    className={`p-2 rounded-lg border transition-colors ${
                      b.incluido
                        ? 'bg-success-500/20 text-success-500 border-success-500/40'
                        : 'bg-bg-raised text-text-tertiary border-subtle'
                    }`}
                    title={b.incluido ? 'Incluido' : 'No incluido'}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  <input
                    type="text"
                    value={b.texto}
                    onChange={(e) => handleBenefitChange(idx, 'texto', e.target.value)}
                    placeholder="Ej. Acceso libre, 3 visitas/semana..."
                    className="flex-1 px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
                  />

                  <button
                    aria-label="Quitar beneficio"
                    type="button"
                    onClick={() => removeBenefit(idx)}
                    className="p-2 rounded-lg text-text-tertiary hover:text-error-500 hover:bg-bg-raised transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {errors.beneficios && (
                <p className="text-xs text-error-500">{errors.beneficios}</p>
              )}
            </div>
          </div>

          {/* Matriz Comparativa Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Matriz comparativa
              </label>
              <button
                type="button"
                onClick={addMatrizRow}
                className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar fila
              </button>
            </div>
            {matrizRows.length === 0 ? (
              <p className="text-xs text-text-tertiary italic">Sin datos de comparativa. Agregá filas para definir características.</p>
            ) : (
              <div className="space-y-2">
                {matrizRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-text-tertiary shrink-0" />
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => handleMatrizRowChange(idx, 'key', e.target.value)}
                      placeholder="Característica (ej: pase_libre)"
                      className="flex-1 px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors font-mono"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => handleMatrizRowChange(idx, 'value', e.target.value)}
                      placeholder="Valor (ej: ✔, 3x/sem)"
                      className="flex-1 px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
                    />
                    <button
                      aria-label="Quitar fila de la matriz"
                      type="button"
                      onClick={() => removeMatrizRow(idx)}
                      className="p-2 rounded-lg text-text-tertiary hover:text-error-500 hover:bg-bg-raised transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-subtle bg-bg-raised/40 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
          >
            Cancelar
          </button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            data-testid="plan-form-submit"
            className="gap-1.5 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isDuplicate ? 'Duplicar Plan' : planToEdit ? 'Guardar Cambios' : 'Crear Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
