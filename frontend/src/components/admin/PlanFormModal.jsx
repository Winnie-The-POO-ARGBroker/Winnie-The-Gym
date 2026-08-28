import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Check, Sparkles } from 'lucide-react'
import Button from '../ui/Button'

export default function PlanFormModal({ isOpen, onClose, onSave, planToEdit = null, isDuplicate = false }) {
  const [formData, setFormData] = useState({
    nombre: '',
    subtitulo: '',
    precio: '',
    duracion_dias: 30,
    clases_asignadas: 0,
    es_popular: false,
    activo: true,
    beneficios: [
      { texto: 'Pase libre al gimnasio', incluido: true },
      { texto: 'Acceso a clases grupales', incluido: true },
      { texto: 'Seguimiento por entrenador', incluido: false },
    ],
    matriz_comparativa: {
      pase_libre: '✔',
      reservas_clases: 'Todas',
      entrenador_asignado: false,
      rutina_personalizada: true,
      acceso_multisede: '1 sede',
      invitado_mensual: false,
      congelar_plan: '1 mes',
    },
  })

  useEffect(() => {
    if (planToEdit) {
      setFormData({
        ...planToEdit,
        nombre: isDuplicate ? `${planToEdit.nombre} (Copia)` : planToEdit.nombre,
        id: isDuplicate ? undefined : planToEdit.id,
      })
    } else {
      setFormData({
        nombre: '',
        subtitulo: '',
        precio: '',
        duracion_dias: 30,
        clases_asignadas: 0,
        es_popular: false,
        activo: true,
        beneficios: [
          { texto: 'Pase libre al gimnasio', incluido: true },
          { texto: 'Acceso a clases grupales', incluido: true },
          { texto: 'Seguimiento por entrenador', incluido: false },
        ],
        matriz_comparativa: {
          pase_libre: '✔',
          reservas_clases: 'Todas',
          entrenador_asignado: false,
          rutina_personalizada: true,
          acceso_multisede: '1 sede',
          invitado_mensual: false,
          congelar_plan: '1 mes',
        },
      })
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.nombre.trim()) return
    if (!formData.precio) return

    onSave({
      ...formData,
      precio: Number(formData.precio),
      clases_asignadas: Number(formData.clases_asignadas) || 0,
      duracion_dias: Number(formData.duracion_dias) || 30,
      socios_activos: formData.socios_activos || (isDuplicate ? 0 : 15),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-bg-surface border border-subtle w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-bg-raised/40">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {isDuplicate ? 'Duplicar Plan' : planToEdit ? 'Editar Plan de Membresía' : 'Crear Nuevo Plan'}
            </h2>
            <p className="text-xs text-text-secondary">
              Definí el precio, duración y beneficios comerciales de la membresía
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-raised transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm font-semibold focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Duración (días)
              </label>
              <select
                value={formData.duracion_dias}
                onChange={(e) => setFormData({ ...formData, duracion_dias: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
              >
                <option value={30}>30 días (Mensual)</option>
                <option value={90}>90 días (Trimestral)</option>
                <option value={180}>180 días (Semestral)</option>
                <option value={365}>365 días (Anual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Clases asignadas
              </label>
              <select
                value={formData.clases_asignadas}
                onChange={(e) => setFormData({ ...formData, clases_asignadas: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
              >
                <option value={0}>0 (Sin clases)</option>
                <option value={8}>8 clases / mes</option>
                <option value={12}>12 clases / mes</option>
                <option value={999}>Ilimitadas</option>
              </select>
            </div>
          </div>

          {/* Popular toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-raised/60 border border-subtle">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">Destacar como "POPULAR"</p>
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
                    className="flex-1 px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-xs focus:outline-none focus:border-orange-500 transition-colors"
                  />

                  <button
                    type="button"
                    onClick={() => removeBenefit(idx)}
                    className="p-2 rounded-lg text-text-tertiary hover:text-error-500 hover:bg-bg-raised transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-subtle bg-bg-raised/40">
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
            className="gap-1.5 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isDuplicate ? 'Duplicar Plan' : planToEdit ? 'Guardar Cambios' : 'Crear Plan'}
          </Button>
        </div>
      </div>
    </div>
  )
}
