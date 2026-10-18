const FIELD_LABELS = {
  nombre: 'Nombre',
  apellido: 'Apellido',
  instructor: 'Instructor',
  recurrencia: 'Recurrencia',
  dia: 'Día',
  hora: 'Hora',
  sala: 'Sala',
  categoria: 'Disciplina',
  cupo_maximo: 'Cupo máximo',
  duracion_min: 'Duración',
  lista_espera_max: 'Lista de espera',
  cancelacion_horas: 'Cancelación',
  precio: 'Precio',
  dni: 'DNI',
  email: 'Email',
  telefono: 'Teléfono',
}

const MAX_MESSAGES = 3

/**
 * Builds a readable message from an Axios error.
 *
 * Order: API `detail`, then `message`, then DRF field validation errors
 * ({ campo: ['mensaje'] }) named after their field, then `fallback`.
 */
export function extractErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (data?.detail) return data.detail
  if (data?.message) return data.message

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const messages = Object.entries(data).flatMap(([field, value]) =>
      (Array.isArray(value) ? value : [value])
        .filter((text) => typeof text === 'string' && text.trim())
        .map((text) => (field === 'non_field_errors' ? text : `${FIELD_LABELS[field] ?? field}: ${text}`))
    )
    if (messages.length > 0) return messages.slice(0, MAX_MESSAGES).join(' · ')
  }

  return fallback
}
