import { useState, useEffect } from 'react'
import { X, Check, UserPlus, Edit, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'
import Button from '../ui/Button'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB per backend RF08

export default function SocioFormModal({
  isOpen,
  onClose,
  onSave,
  socioToEdit = null,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    estado: 'activo',
    observaciones: '',
  })
  const [certificadoFile, setCertificadoFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (socioToEdit) {
      setFormData({
        id: socioToEdit.id,
        numero_socio: socioToEdit.numero_socio || '',
        nombre: socioToEdit.nombre || '',
        apellido: socioToEdit.apellido || '',
        dni: socioToEdit.dni || '',
        telefono: socioToEdit.telefono || '',
        estado: socioToEdit.estado || 'activo',
        observaciones: socioToEdit.observaciones || '',
      })
    } else {
      setFormData({
        nombre: '',
        apellido: '',
        dni: '',
        telefono: '',
        estado: 'activo',
        observaciones: '',
      })
    }
    setCertificadoFile(null)
    setFileError(null)
    setErrors({})
  }, [socioToEdit, isOpen])

  if (!isOpen) return null

  const isEditing = !!socioToEdit

  const validate = () => {
    const errs = {}
    if (!formData.nombre?.trim()) errs.nombre = 'El nombre es obligatorio'
    if (!formData.apellido?.trim()) errs.apellido = 'El apellido es obligatorio'
    if (!formData.dni?.trim()) {
      errs.dni = 'El DNI es obligatorio'
    } else if (!/^\d{7,10}$/.test(formData.dni.trim())) {
      errs.dni = 'DNI inválido (debe tener entre 7 y 10 dígitos numéricos)'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      dni: formData.dni.trim(),
      telefono: formData.telefono?.trim() || '',
      estado: formData.estado,
      observaciones: formData.observaciones?.trim() || '',
    }

    if (isEditing) {
      payload.id = formData.id
    }

    await onSave(payload, certificadoFile)
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-bg-surface border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              {isEditing ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">
                {isEditing ? 'Editar Socio' : 'Nuevo Socio'}
              </h3>
              <p className="text-xs text-text-secondary">
                {isEditing
                  ? `Modificando socio Nº ${formData.numero_socio || formData.id}`
                  : 'Completa los datos para registrar un socio'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Nombre <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                placeholder="Ej. Juan"
                className={`w-full px-3 py-2 rounded-xl text-sm bg-bg-raised border ${
                  errors.nombre ? 'border-rose-500' : 'border-subtle'
                } text-text-primary focus:outline-none focus:border-orange-500 transition-colors`}
              />
              {errors.nombre && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.nombre}
                </p>
              )}
            </div>

            {/* Apellido */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Apellido <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.apellido}
                onChange={(e) => handleChange('apellido', e.target.value)}
                placeholder="Ej. Pérez"
                className={`w-full px-3 py-2 rounded-xl text-sm bg-bg-raised border ${
                  errors.apellido ? 'border-rose-500' : 'border-subtle'
                } text-text-primary focus:outline-none focus:border-orange-500 transition-colors`}
              />
              {errors.apellido && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.apellido}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DNI */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                DNI <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.dni}
                onChange={(e) => handleChange('dni', e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 38450123"
                className={`w-full px-3 py-2 rounded-xl text-sm bg-bg-raised border ${
                  errors.dni ? 'border-rose-500' : 'border-subtle'
                } text-text-primary focus:outline-none focus:border-orange-500 transition-colors`}
              />
              {errors.dni && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.dni}
                </p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                placeholder="Ej. 11 4567-8901"
                className="w-full px-3 py-2 rounded-xl text-sm bg-bg-raised border border-subtle text-text-primary focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Estado
            </label>
            <select
              value={formData.estado}
              onChange={(e) => handleChange('estado', e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm bg-bg-raised border border-subtle text-text-primary focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
            >
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              rows={3}
              value={formData.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Notas internas sobre el socio, aptitud, restricciones..."
              className="w-full px-3 py-2 rounded-xl text-sm bg-bg-raised border border-subtle text-text-primary focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
          </div>

          {/* Certificado Médico (RF08) */}
          <div className="p-3.5 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-orange-500" />
                Certificado Médico (HU03, RF08)
              </label>
              <span className="text-[10px] text-text-secondary bg-bg-surface px-1.5 py-0.5 rounded border border-subtle">
                PDF / JPG máx. 5 MB
              </span>
            </div>

            {isEditing && socioToEdit?.certificado_medico_url && !certificadoFile && (
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Posee certificado médico cargado
                </span>
                <a
                  href={socioToEdit.certificado_medico_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-emerald-400 font-medium"
                >
                  Ver actual
                </a>
              </div>
            )}

            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > MAX_FILE_SIZE) {
                  setFileError('El archivo supera los 5 MB permitidos.')
                  setCertificadoFile(null)
                  return
                }
                setFileError(null)
                setCertificadoFile(file)
              }}
              className="w-full text-xs text-text-secondary file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-500/10 file:text-orange-500 hover:file:bg-orange-500/20 cursor-pointer"
            />

            {certificadoFile && (
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Seleccionado: {certificadoFile.name} ({(certificadoFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}

            {fileError && (
              <p className="text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {fileError}
              </p>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-subtle mt-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isLoading}
              className="gap-2 shadow-md shadow-orange-500/20"
            >
              <Check className="w-4 h-4" />
              {isEditing ? 'Guardar Cambios' : 'Registrar Socio'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
