import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function SalaFormModal({ isOpen, onClose, onSave, salaToEdit = null }) {
  const [nombre, setNombre] = useState('')
  const [capacidad, setCapacidad] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setErrors({})
    if (salaToEdit) {
      setNombre(salaToEdit.nombre ?? '')
      setCapacidad(String(salaToEdit.capacidad ?? ''))
    } else {
      setNombre('')
      setCapacidad('')
    }
  }, [salaToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido'
    const cap = Number(capacidad)
    if (!capacidad || isNaN(cap) || cap < 1) newErrors.capacidad = 'La capacidad debe ser mayor a 0'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSave({ nombre: nombre.trim(), capacidad: cap })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={salaToEdit ? 'Editar sala' : 'Nueva sala'}
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
            placeholder="Ej. Sala A, Sala Principal..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            data-testid="sala-form-nombre"
            className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm focus:outline-none transition-colors ${errors.nombre ? 'border-error-500' : 'border-subtle focus:border-orange-500'}`}
          />
          {errors.nombre && <p className="mt-1 text-xs text-error-500">{errors.nombre}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Capacidad *
          </label>
          <input
            type="number"
            min="1"
            required
            placeholder="Ej. 25"
            value={capacidad}
            onChange={(e) => setCapacidad(e.target.value)}
            data-testid="sala-form-capacidad"
            className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm focus:outline-none transition-colors ${errors.capacidad ? 'border-error-500' : 'border-subtle focus:border-orange-500'}`}
          />
          {errors.capacidad && <p className="mt-1 text-xs text-error-500">{errors.capacidad}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <Button variant="primary" type="submit" data-testid="sala-form-submit">
            {salaToEdit ? 'Guardar cambios' : 'Crear sala'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
