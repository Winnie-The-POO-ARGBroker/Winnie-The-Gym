import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const COLORS = [
  '#f97316', '#ef4444', '#3b82f6', '#22c55e',
  '#a855f7', '#eab308', '#06b6d4', '#ec4899',
]

export default function DisciplinaFormModal({ isOpen, onClose, onSave, disciplinaToEdit = null }) {
  const [nombre, setNombre] = useState('')
  const [colorHex, setColorHex] = useState(COLORS[0])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setErrors({})
    if (disciplinaToEdit) {
      setNombre(disciplinaToEdit.nombre ?? '')
      setColorHex(disciplinaToEdit.color_hex ?? COLORS[0])
    } else {
      setNombre('')
      setColorHex(COLORS[0])
    }
  }, [disciplinaToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSave({ nombre: nombre.trim(), color_hex: colorHex })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={disciplinaToEdit ? 'Editar disciplina' : 'Nueva disciplina'}
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Nombre *
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Funcional, Spinning..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            data-testid="disciplina-form-nombre"
            className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm focus:outline-none transition-colors ${errors.nombre ? 'border-error-500' : 'border-subtle focus:border-orange-500'}`}
          />
          {errors.nombre && <p className="mt-1 text-xs text-error-500">{errors.nombre}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColorHex(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${colorHex === c ? 'border-text-primary scale-110' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-7 h-7 rounded-full border border-subtle cursor-pointer"
              title="Color personalizado"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <Button variant="primary" type="submit" data-testid="disciplina-form-submit">
            {disciplinaToEdit ? 'Guardar cambios' : 'Crear disciplina'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
