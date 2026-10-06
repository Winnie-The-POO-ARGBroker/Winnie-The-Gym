export class ClassifiedError extends Error {
  constructor(type, message, originalError, status) {
    super(message)
    this.name = 'ClassifiedError'
    this.type = type
    this.originalError = originalError
    this.status = status
  }
}

export function classifyError(error) {
  if (!error.response) {
    return new ClassifiedError('network', 'Error de red', error, null)
  }

  const status = error.response.status
  if (status === 401 || status === 403) {
    return new ClassifiedError('auth', 'Sesión expirada', error, status)
  } else if (status === 404) {
    return new ClassifiedError('notfound', 'No encontrado', error, status)
  } else if (status >= 500) {
    return new ClassifiedError('server', 'Error interno, intentá más tarde', error, status)
  }

  return new ClassifiedError('unknown', error.message || 'Error desconocido', error, status)
}
