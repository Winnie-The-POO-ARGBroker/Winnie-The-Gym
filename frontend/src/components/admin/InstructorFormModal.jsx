import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const ESPECIALIDADES_OPCIONES = [
  'funcional',
  'spinning',
  'crossfit',
  'pilates',
  'yoga',
  'boxeo',
  'hiit',
  'musculacion',
  'natacion',
  'zumba',
]

const EMPTY_FORM = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  especialidades: [],
  bio: '',
  activo: true,
}

/**
 * Form modal to create or edit an Instructor (Fase 1 — no login).
 *
 * Props:
 *   isOpen           — boolean
 *   onClose          — () => void
 *   onSave           — (payload) => void | Promise
 *   instructorToEdit — instructor object | null
 *   isAdmin          — boolean (write access guard)
 */
export default function InstructorFormModal({
  isOpen,
  onClose,
  onSave,
  instructorToEdit = null,
  isAdmin = false,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setErrors({})
    if (instructorToEdit) {
      setForm({
        nombre: instructorToEdit.nombre ?? '',
        apellido: instructorToEdit.apellido ?? '',
        email: instructorToEdit.email ?? '',
        telefono: instructorToEdit.telefono ?? '',
        especialidades: instructorToEdit.especialidades ?? [],
        bio: instructorToEdit.bio ?? '',
        activo: instructorToEdit.activo ?? true,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [instructorToEdit, isOpen])

  if (!isOpen) return null

  // Recepcionistas only see the modal in read-only if opened programmatically,
  // but the parent should gate access. Guard here as well.
  if (!isAdmin) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Instructor"
        maxWidth="max-w-md"
      >
        <p className="text-sm text-text-secondary">
          Solo los administradores pueden gestionar instructores.
        </p>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </Modal>
    )
  }

  const toggleEspecialidad = (slug) => {
    setForm((prev) => {
      const exists = prev.especialidades.includes(slug)
      return {
        ...prev,
        especialidades: exists
          ? prev.especialidades.filter((e) => e !== slug)
          : [...prev.especialidades, slug],
      }
    })
  }

  const validate = () => {
    const newErrors = {}
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre es requerido'
    if (!form.apellido.trim()) newErrors.apellido = 'El apellido es requerido'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email invalido'
    }
    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    onSave({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      especialidades: form.especialidades,
      bio: form.bio.trim(),
      activo: form.activo,
    })
  }

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    },
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={instructorToEdit ? 'Editar instructor' : 'Nuevo instructor'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="instructor-form">
        {/* Nombre + Apellido */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Nombre *
            </label>
            <input
              type="text"
              required
              placeholder="Juan"
              data-testid="instructor-nombre"
              {...field('nombre')}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base transition-colors ${
                errors.nombre ? 'border-error-500' : 'border-subtle focus:border-orange-500'
              }`}
            />
            {errors.nombre && <p className="mt-1 text-xs text-error-500">{errors.nombre}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Apellido *
            </label>
            <input
              type="text"
              required
              placeholder="Perez"
              data-testid="instructor-apellido"
              {...field('apellido')}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base transition-colors ${
                errors.apellido ? 'border-error-500' : 'border-subtle focus:border-orange-500'
              }`}
            />
            {errors.apellido && <p className="mt-1 text-xs text-error-500">{errors.apellido}</p>}
          </div>
        </div>

        {/* Email + Telefono */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Email
            </label>
            <input
              type="email"
              placeholder="juan@gym.com"
              data-testid="instructor-email"
              {...field('email')}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base transition-colors ${
                errors.email ? 'border-error-500' : 'border-subtle focus:border-orange-500'
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-error-500">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Telefono
            </label>
            <input
              type="tel"
              placeholder="+54 9 11 ..."
              data-testid="instructor-telefono"
              {...field('telefono')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Especialidades chips */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">
            Especialidades
          </label>
          <div className="flex flex-wrap gap-2" data-testid="especialidades-chips">
            {ESPECIALIDADES_OPCIONES.map((slug) => {
              const active = form.especialidades.includes(slug)
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleEspecialidad(slug)}
                  data-testid={`chip-${slug}`}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-orange-500/15 border-orange-500 text-orange-500'
                      : 'bg-bg-raised border-subtle text-text-secondary hover:border-strong hover:text-text-primary'
                  }`}
                >
                  {slug}
                  {active && <X className="w-3 h-3" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Bio
          </label>
          <textarea
            rows={3}
            placeholder="Contanos sobre su experiencia y especialidad..."
            data-testid="instructor-bio"
            value={form.bio}
            onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
            className="w-full px-3.5 py-2.5 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors resize-none"
          />
        </div>

        {/* Activo toggle */}
        <div className="flex items-center gap-3">
          <button
            aria-label="Instructor activo"
            type="button"
            role="switch"
            aria-checked={form.activo}
            data-testid="instructor-activo"
            onClick={() => setForm((prev) => ({ ...prev, activo: !prev.activo }))}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base ${
              form.activo ? 'bg-success-500' : 'bg-bg-raised border border-subtle'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                form.activo ? 'translate-x-4.5' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-xs text-text-secondary">
            {form.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <Button variant="primary" type="submit" data-testid="instructor-form-submit">
            {instructorToEdit ? 'Guardar cambios' : 'Crear instructor'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
