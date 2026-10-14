import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const AFECTA_OPTIONS = [
  { value: 'todo', label: 'Todo el gimnasio' },
  { value: 'sala', label: 'Una sala específica' },
]

export default function CierreFormModal({ isOpen, onClose, onSave, cierreToEdit = null }) {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [afecta, setAfecta] = useState('todo')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setErrors({})
    if (cierreToEdit) {
      setFechaDesde(cierreToEdit.fecha_desde ?? '')
      setFechaHasta(cierreToEdit.fecha_hasta ?? '')
      setMotivo(cierreToEdit.motivo ?? '')
      setAfecta(cierreToEdit.afecta ?? 'todo')
    } else {
      setFechaDesde('')
      setFechaHasta('')
      setMotivo('')
      setAfecta('todo')
    }
  }, [cierreToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!fechaDesde) newErrors.fechaDesde = 'La fecha de inicio es requerida'
    if (!fechaHasta) newErrors.fechaHasta = 'La fecha de fin es requerida'
    if (fechaDesde && fechaHasta && fechaHasta < fechaDesde) {
      newErrors.fechaHasta = 'La fecha de fin no puede ser anterior a la de inicio'
    }
    if (!motivo.trim()) newErrors.motivo = 'El motivo es requerido'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      motivo: motivo.trim(),
      afecta,
    })
  }

  const inputClass = (hasError) =>
    `w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm focus:outline-none transition-colors ${
      hasError ? 'border-error-500' : 'border-subtle focus:border-orange-500'
    }`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cierreToEdit ? 'Editar cierre' : 'Nuevo cierre / feriado'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Fecha desde */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Fecha desde *
          </label>
          <input
            type="date"
            required
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            data-testid="cierre-form-fecha-desde"
            className={inputClass(!!errors.fechaDesde)}
          />
          {errors.fechaDesde && (
            <p className="mt-1 text-xs text-error-500">{errors.fechaDesde}</p>
          )}
        </div>

        {/* Fecha hasta */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Fecha hasta *
          </label>
          <input
            type="date"
            required
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            data-testid="cierre-form-fecha-hasta"
            className={inputClass(!!errors.fechaHasta)}
          />
          {errors.fechaHasta && (
            <p className="mt-1 text-xs text-error-500">{errors.fechaHasta}</p>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Motivo *
          </label>
          <input
            type="text"
            required
            maxLength={200}
            placeholder="Ej: Feriado nacional, Mantenimiento, Vacaciones..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            data-testid="cierre-form-motivo"
            className={inputClass(!!errors.motivo)}
          />
          {errors.motivo && (
            <p className="mt-1 text-xs text-error-500">{errors.motivo}</p>
          )}
        </div>

        {/* Afecta */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Afecta
          </label>
          <select
            value={afecta}
            onChange={(e) => setAfecta(e.target.value)}
            data-testid="cierre-form-afecta"
            className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
          >
            {AFECTA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <Button variant="primary" type="submit" data-testid="cierre-form-submit">
            {cierreToEdit ? 'Guardar cambios' : 'Crear cierre'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
