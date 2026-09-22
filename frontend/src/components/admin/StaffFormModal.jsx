import { useState, useEffect } from 'react'
import { UserPlus } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useStaffCreate } from '../../hooks/queries/useStaff'

const INITIAL_FORM = {
  email: '',
  first_name: '',
  last_name: '',
  rol: 'recepcionista',
}

function validate(form) {
  const errors = {}
  if (!form.email.trim()) {
    errors.email = 'El email es obligatorio'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Ingresá un email válido'
  }
  if (!form.first_name.trim()) errors.first_name = 'El nombre es obligatorio'
  if (!form.last_name.trim()) errors.last_name = 'El apellido es obligatorio'
  if (!['administrador', 'recepcionista'].includes(form.rol)) {
    errors.rol = 'Rol inválido'
  }
  return errors
}

/**
 * Modal to create a new staff user (administrador or recepcionista).
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen
 * @param {function} props.onClose
 */
export default function StaffFormModal({ isOpen, onClose }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})

  const createMutation = useStaffCreate()

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM)
      setErrors({})
    }
  }, [isOpen])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      await createMutation.mutateAsync({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        rol: form.rol,
      })
      onClose()
    } catch (err) {
      // Field-level errors from backend (e.g. duplicate email)
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        const backendErrors = {}
        for (const [field, messages] of Object.entries(data)) {
          backendErrors[field] = Array.isArray(messages)
            ? messages.join(', ')
            : messages
        }
        setErrors(backendErrors)
      }
    }
  }

  const pending = createMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear nuevo staff"
      description="El usuario recibirá un email para establecer su contraseña."
      icon={<UserPlus className="w-5 h-5" />}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1" htmlFor="staff-email">
            Email
          </label>
          <input
            id="staff-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="nombre@empresa.com"
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-bg-raised text-text-primary placeholder:text-text-tertiary outline-none transition-colors focus:ring-2 focus:ring-primary/30 ${
              errors.email ? 'border-error-500' : 'border-subtle'
            }`}
            autoComplete="email"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-error-500">{errors.email}</p>
          )}
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1" htmlFor="staff-nombre">
            Nombre
          </label>
          <input
            id="staff-nombre"
            name="first_name"
            type="text"
            value={form.first_name}
            onChange={handleChange}
            placeholder="Juan"
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-bg-raised text-text-primary placeholder:text-text-tertiary outline-none transition-colors focus:ring-2 focus:ring-primary/30 ${
              errors.first_name ? 'border-error-500' : 'border-subtle'
            }`}
          />
          {errors.first_name && (
            <p className="mt-1 text-xs text-error-500">{errors.first_name}</p>
          )}
        </div>

        {/* Apellido */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1" htmlFor="staff-apellido">
            Apellido
          </label>
          <input
            id="staff-apellido"
            name="last_name"
            type="text"
            value={form.last_name}
            onChange={handleChange}
            placeholder="García"
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-bg-raised text-text-primary placeholder:text-text-tertiary outline-none transition-colors focus:ring-2 focus:ring-primary/30 ${
              errors.last_name ? 'border-error-500' : 'border-subtle'
            }`}
          />
          {errors.last_name && (
            <p className="mt-1 text-xs text-error-500">{errors.last_name}</p>
          )}
        </div>

        {/* Rol */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1" htmlFor="staff-rol">
            Rol
          </label>
          <select
            id="staff-rol"
            name="rol"
            value={form.rol}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-bg-raised text-text-primary outline-none transition-colors focus:ring-2 focus:ring-primary/30 ${
              errors.rol ? 'border-error-500' : 'border-subtle'
            }`}
          >
            <option value="recepcionista">Recepcionista</option>
            <option value="administrador">Administrador</option>
          </select>
          {errors.rol && (
            <p className="mt-1 text-xs text-error-500">{errors.rol}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={pending} disabled={pending}>
            Crear staff
          </Button>
        </div>
      </form>
    </Modal>
  )
}
