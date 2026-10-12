import { describe, it, expect } from 'vitest'
import { classifyError, ClassifiedError } from '../errorHandling'

describe('errorHandling utils', () => {
  it('instantiates ClassifiedError with provided properties', () => {
    const orig = new Error('original')
    const err = new ClassifiedError('test', 'custom msg', orig, 418)
    expect(err.name).toBe('ClassifiedError')
    expect(err.type).toBe('test')
    expect(err.message).toBe('custom msg')
    expect(err.originalError).toBe(orig)
    expect(err.status).toBe(418)
  })

  it('classifies network error when error.response is falsy', () => {
    const error = new Error('Network timeout')
    const result = classifyError(error)
    expect(result.type).toBe('network')
    expect(result.message).toBe('Error de red')
    expect(result.status).toBeNull()
  })

  it('classifies auth error for 401 status', () => {
    const error = { response: { status: 401 } }
    const result = classifyError(error)
    expect(result.type).toBe('auth')
    expect(result.message).toBe('Sesión expirada')
    expect(result.status).toBe(401)
  })

  it('classifies auth error for 403 status', () => {
    const error = { response: { status: 403 } }
    const result = classifyError(error)
    expect(result.type).toBe('auth')
    expect(result.message).toBe('Sesión expirada')
    expect(result.status).toBe(403)
  })

  it('classifies notfound error for 404 status', () => {
    const error = { response: { status: 404 } }
    const result = classifyError(error)
    expect(result.type).toBe('notfound')
    expect(result.message).toBe('No encontrado')
    expect(result.status).toBe(404)
  })

  it('classifies server error for 500 status', () => {
    const error = { response: { status: 500 } }
    const result = classifyError(error)
    expect(result.type).toBe('server')
    expect(result.message).toBe('Error interno, intentá más tarde')
    expect(result.status).toBe(500)
  })

  it('classifies unknown error for 400 or other 4xx status with error message', () => {
    const error = { response: { status: 400 }, message: 'Bad request payload' }
    const result = classifyError(error)
    expect(result.type).toBe('unknown')
    expect(result.message).toBe('Bad request payload')
    expect(result.status).toBe(400)
  })

  it('classifies unknown error for 400 without error message', () => {
    const error = { response: { status: 400 } }
    const result = classifyError(error)
    expect(result.type).toBe('unknown')
    expect(result.message).toBe('Error desconocido')
    expect(result.status).toBe(400)
  })
})
