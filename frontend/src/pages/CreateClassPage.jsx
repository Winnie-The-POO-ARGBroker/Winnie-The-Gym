import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Check,
  Eye,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Copy,
  Save,
  Sparkles,
} from 'lucide-react'

const IS_DEV = import.meta.env.DEV
import { toast } from 'sonner'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import { DISCIPLINAS_CONFIG } from '../constants/disciplinas'
import {
  getClassById,
  saveOrUpdateClass,
  getStoredClasses,
} from '../services/adminMockData'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const RECURRENCIA_DIAS = [
  { key: 'L', label: 'L' },
  { key: 'M', label: 'M' },
  { key: 'X', label: 'X' },
  { key: 'J', label: 'J' },
  { key: 'V', label: 'V' },
  { key: 'S', label: 'S' },
  { key: 'D', label: 'D' },
]

export default function CreateClassPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const [formData, setFormData] = useState({
    nombre: 'Funcional Intensivo',
    categoria: 'funcional',
    descripcion: 'Entrenamiento funcional de alta intensidad con foco en tren superior y core.',
    dia: 'Lunes',
    hora: '08:00',
    duracion_min: 45,
    sala: 'Sala A',
    instructor: 'Carlos R.',
    dias_recurrencia: ['L', 'X', 'V'],
    recurrencia: 'Semanal - L/M/V',
    cupo_maximo: 20,
    cupos_reservados: 0,
    lista_espera_max: 5,
    cancelacion_horas: 2,
    planes_habilitados: ['Premium', 'Gold'],
  })

  useEffect(() => {
    if (editId) {
      const existing = getClassById(editId)
      if (existing) {
        setFormData(existing)
      }
    }
  }, [editId])

  const currentCfg =
    DISCIPLINAS_CONFIG[formData.categoria] || DISCIPLINAS_CONFIG.funcional

  const handleDayRecurrenceToggle = (dayKey) => {
    const exists = formData.dias_recurrencia.includes(dayKey)
    const updated = exists
      ? formData.dias_recurrencia.filter((d) => d !== dayKey)
      : [...formData.dias_recurrencia, dayKey]

    setFormData((prev) => ({
      ...prev,
      dias_recurrencia: updated,
      recurrencia: `Semanal - ${updated.join('/')}`,
    }))
  }

  const handlePlanToggle = (planName) => {
    const exists = formData.planes_habilitados.includes(planName)
    const updated = exists
      ? formData.planes_habilitados.filter((p) => p !== planName)
      : [...formData.planes_habilitados, planName]

    setFormData((prev) => ({
      ...prev,
      planes_habilitados: updated,
    }))
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la clase es obligatorio')
      return
    }

    // Calculate end time
    const [h, m] = (formData.hora || '08:00').split(':').map(Number)
    const totalMinutes = h * 60 + m + Number(formData.duracion_min || 45)
    const endH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')
    const endM = String(totalMinutes % 60).padStart(2, '0')
    const hora_fin = `${endH}:${endM}`

    const saved = saveOrUpdateClass({
      ...formData,
      hora_fin,
      duracion_min: Number(formData.duracion_min),
      cupo_maximo: Number(formData.cupo_maximo),
      lista_espera_max: Number(formData.lista_espera_max),
      cancelacion_horas: Number(formData.cancelacion_horas),
    })

    toast.success(
      editId
        ? `Clase "${formData.nombre}" actualizada con éxito`
        : `Clase "${formData.nombre}" publicada correctamente`
    )
    navigate('/clases')
  }

  const handleDuplicateFromExisting = () => {
    const allClasses = getStoredClasses()
    if (allClasses.length > 0) {
      const toClone = allClasses[0]
      setFormData({
        ...toClone,
        id: undefined,
        nombre: `${toClone.nombre} (Copia)`,
        cupos_reservados: 0,
      })
      toast.info('Datos copiados de una clase existente')
    }
  }

  return (
    <AppLayout>
      <TopBar
        title={editId ? 'Editar clase' : 'Crear clase'}
        backAction={{ to: '/admin/clases' }}
        rightContent={
          <>
            <button
              type="button"
              onClick={() => navigate('/clases')}
              className="px-4 py-2.5 rounded-xl bg-bg-surface border border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-raised text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              className="gap-2 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              {editId ? 'Guardar cambios' : 'Publicar clase'}
            </Button>
          </>
        }
      />
      <div className="w-full flex-1 flex flex-col p-6 md:p-10 gap-7 overflow-y-auto max-w-[1840px] mx-auto transition-all animate-fadeIn">

        {/* Main Content Area */}
        <div className="flex flex-col xl:flex-row gap-8">

          {/* FORM AREA (Left - flex-1) */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">

            {/* 1. Información General */}
            <div className="bg-bg-surface rounded-2xl p-6 border border-subtle border-l-4 border-l-orange-500 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-text-primary">
                Información general
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Nombre de la clase *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej. Funcional Intensivo, Spinning Pro..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Actividad / Disciplina *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="funcional">Funcional</option>
                    <option value="spinning">Spinning</option>
                    <option value="crossfit">Crossfit</option>
                    <option value="pilates">Pilates</option>
                    <option value="yoga">Yoga</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Descripción
                </label>
                <textarea
                  rows="3"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describí los objetivos, nivel de intensidad y detalles del entrenamiento..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>
            </div>

            {/* 2. Horario y Lugar */}
            <div className="bg-bg-surface rounded-2xl p-6 border border-subtle border-l-4 border-l-blue-500 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-text-primary">
                Horario y lugar
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Día principal
                  </label>
                  <select
                    value={formData.dia}
                    onChange={(e) => setFormData({ ...formData, dia: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    {DIAS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Hora inicio
                  </label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="5"
                    value={formData.duracion_min}
                    onChange={(e) => setFormData({ ...formData, duracion_min: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Sala
                  </label>
                  <select
                    value={formData.sala}
                    onChange={(e) => setFormData({ ...formData, sala: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="Sala A">Sala A (Principal)</option>
                    <option value="Sala B">Sala B (Spinning / Reformer)</option>
                    <option value="Sala C">Sala C (Yoga / Meditación)</option>
                  </select>
                </div>
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Instructor a cargo
                </label>
                <select
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  className="w-full max-w-sm px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="Carlos R.">Carlos R. (Funcional / Crossfit)</option>
                  <option value="Sofia L.">Sofia L. (Spinning / Pilates)</option>
                  <option value="Pedro M.">Pedro M. (Crossfit / WOD)</option>
                  <option value="Ana T.">Ana T. (Yoga / Postural)</option>
                </select>
              </div>

              {/* Recurrencia semanal */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2">
                  Recurrencia semanal (Días de dictado)
                </label>
                <div className="flex flex-wrap gap-2">
                  {RECURRENCIA_DIAS.map((d) => {
                    const active = formData.dias_recurrencia.includes(d.key)
                    return (
                      <button
                        type="button"
                        key={d.key}
                        onClick={() => handleDayRecurrenceToggle(d.key)}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                          active
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                            : 'bg-bg-raised text-text-secondary border border-subtle hover:border-strong hover:text-text-primary'
                        }`}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 3. Cupos y Reservas */}
            <div className="bg-bg-surface rounded-2xl p-6 border border-subtle border-l-4 border-l-green-500 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-text-primary">
                Cupos y reservas
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Cupo máximo *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cupo_maximo}
                    onChange={(e) => setFormData({ ...formData, cupo_maximo: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm font-semibold focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Lista de espera (lugares)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lista_espera_max}
                    onChange={(e) => setFormData({ ...formData, lista_espera_max: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Cancelación sin cargo (hs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cancelacion_horas}
                    onChange={(e) => setFormData({ ...formData, cancelacion_horas: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              {/* Planes Habilitados */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2">
                  Planes habilitados para reservar esta clase
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {['Básico', 'Premium', 'Gold'].map((plan) => {
                    const isChecked = formData.planes_habilitados.includes(plan)

                    return (
                      <button
                        type="button"
                        key={plan}
                        onClick={() => handlePlanToggle(plan)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          isChecked
                            ? plan === 'Premium'
                              ? 'bg-orange-500/15 border-orange-500 text-orange-500'
                              : plan === 'Gold'
                              ? 'bg-warning-500/15 border-warning-500 text-warning-500'
                              : 'bg-success-500/15 border-success-500 text-success-500'
                            : 'bg-bg-raised border-subtle text-text-tertiary'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                            isChecked ? 'bg-current text-white' : 'border border-subtle'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        {plan}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </form>

          {/* RIGHT SIDEBAR: LIVE PREVIEW (xl:w-[380px]) */}
          <div className="w-full xl:w-[380px] flex flex-col gap-6">

            {/* Live Preview Card */}
            <div className="bg-bg-surface rounded-2xl p-6 border border-subtle border-l-4 border-l-orange-500 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-orange-500" />
                  Vista previa en vivo
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success-500/10 text-success-500">
                  Activa
                </span>
              </div>

              <div className="flex flex-col gap-2 mb-6">
                <h3 className="text-xl font-bold text-text-primary tracking-tight">
                  {formData.nombre || 'Nombre de la clase'}
                </h3>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span
                    style={{
                      backgroundColor: currentCfg.bgLight,
                      color: currentCfg.color,
                      borderColor: `${currentCfg.color}40`,
                    }}
                    className="px-2 py-0.5 rounded-full font-bold border text-[11px]"
                  >
                    {currentCfg.label}
                  </span>
                  <span>{formData.recurrencia}</span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {formData.sala} · {formData.duracion_min} min ({formData.hora} hs)
                </p>
                <p className="text-[11px] text-text-tertiary mt-1">
                  {formData.cupos_reservados}/{formData.cupo_maximo} inscriptos
                </p>
              </div>

              <div className="flex flex-col divide-y divide-subtle text-xs">
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-text-tertiary">Instructor</span>
                  <span className="font-semibold text-text-primary">{formData.instructor}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-text-tertiary">Día</span>
                  <span className="font-semibold text-text-primary">{formData.dia}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-text-tertiary">Recurrencia</span>
                  <span className="font-semibold text-text-primary">{formData.recurrencia}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-text-tertiary">Planes</span>
                  <span className="font-semibold text-text-primary">
                    {formData.planes_habilitados.join(', ') || 'Ninguno'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-text-tertiary italic mt-5 pt-4 border-t border-subtle">
                <span className="text-orange-500 font-bold">※</span> Los socios verán esta clase en su portal inmediatamente al ser publicada.
              </p>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-bg-surface rounded-2xl p-6 border border-subtle shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                Acciones rápidas
              </h3>

              <Button
                variant="primary"
                onClick={handleSubmit}
                className="w-full gap-2 shadow-md shadow-orange-500/20 hover:scale-[1.01]"
              >
                <Check className="w-4 h-4" />
                {editId ? 'Guardar cambios' : 'Publicar clase'}
              </Button>

              {IS_DEV && (
                <button
                  type="button"
                  onClick={handleDuplicateFromExisting}
                  className="w-full flex items-center justify-center gap-2 bg-bg-raised hover:bg-bg-surface border border-subtle text-text-primary py-2.5 rounded-xl font-semibold text-xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-text-secondary" />
                  Copiar de clase existente
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
