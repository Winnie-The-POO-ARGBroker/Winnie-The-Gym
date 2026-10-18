import { describe, it, expect } from 'vitest'
import { extractErrorMessage } from '../extractErrorMessage'

const apiError = (data) => ({ response: { status: 400, data } })

describe('extractErrorMessage', () => {
  it('prefers the detail sent by the API', () => {
    expect(extractErrorMessage(apiError({ detail: 'No tenés permiso.' }), 'Error')).toBe('No tenés permiso.')
  })

  it('falls back to message', () => {
    expect(extractErrorMessage(apiError({ message: 'Ocurrió algo' }), 'Error')).toBe('Ocurrió algo')
  })

  it('names the fields of a DRF validation error instead of showing a generic message', () => {
    const err = apiError({
      instructor: ['Este campo no puede estar en blanco.'],
      recurrencia: ['Este campo no puede estar en blanco.'],
    })

    expect(extractErrorMessage(err, 'Error al crear la clase')).toBe(
      'Instructor: Este campo no puede estar en blanco. · Recurrencia: Este campo no puede estar en blanco.'
    )
  })

  it('shows non_field_errors without a field prefix', () => {
    expect(extractErrorMessage(apiError({ non_field_errors: ['La sala está ocupada.'] }), 'Error')).toBe(
      'La sala está ocupada.'
    )
  })

  it('uses the raw field name when it has no friendly label', () => {
    expect(extractErrorMessage(apiError({ campo_raro: ['Valor inválido.'] }), 'Error')).toBe('campo_raro: Valor inválido.')
  })

  it('limits how many messages it joins', () => {
    const err = apiError({ a: ['1'], b: ['2'], c: ['3'], d: ['4'] })

    expect(extractErrorMessage(err, 'Error').split(' · ')).toHaveLength(3)
  })

  it('returns the fallback when there is no response (network error)', () => {
    expect(extractErrorMessage(new Error('timeout'), 'Error al crear la clase')).toBe('Error al crear la clase')
  })
})
