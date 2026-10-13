import { describe, it, expect } from 'vitest'
import { validateDni, validateTelefono, validateEmail } from '../validation'

describe('validation', () => {
  // Test 9 — contract requirement
  describe('validateDni', () => {
    it('rejects non-digit input', () => {
      expect(validateDni('abc')).not.toBeNull()
      expect(validateDni('12-34')).not.toBeNull()
      expect(validateDni('12 34')).not.toBeNull()
    })

    it('rejects DNI shorter than 7 digits', () => {
      expect(validateDni('123456')).not.toBeNull()
    })

    it('rejects DNI longer than 8 digits', () => {
      expect(validateDni('123456789')).not.toBeNull()
    })

    it('accepts a valid 7-digit DNI', () => {
      expect(validateDni('1234567')).toBeNull()
    })

    it('accepts a valid 8-digit DNI', () => {
      expect(validateDni('12345678')).toBeNull()
    })

    it('returns the expected error message for non-digit input', () => {
      expect(validateDni('abc123')).toBe('El DNI debe tener 7 u 8 dígitos.')
    })

    it('returns an error for empty string', () => {
      expect(validateDni('')).not.toBeNull()
    })
  })

  // Test 10 — contract requirement
  describe('validateTelefono', () => {
    it('rejects too-short input', () => {
      expect(validateTelefono('123')).not.toBeNull()
      expect(validateTelefono('12')).not.toBeNull()
    })

    it('rejects letters in phone number', () => {
      expect(validateTelefono('abc-defg-hij')).not.toBeNull()
    })

    it('accepts a valid phone with country code', () => {
      expect(validateTelefono('+5493511234567')).toBeNull()
    })

    it('accepts a phone with spaces and dashes', () => {
      expect(validateTelefono('+54 9 351 123-4567')).toBeNull()
    })

    it('accepts a plain digit phone', () => {
      expect(validateTelefono('1155551234')).toBeNull()
    })

    it('returns the expected error message for too-short input', () => {
      expect(validateTelefono('123')).toBe('Teléfono inválido. Formato esperado: +54 9 351 1234567.')
    })

    it('returns an error for empty string', () => {
      expect(validateTelefono('')).not.toBeNull()
    })
  })

  describe('validateEmail', () => {
    it('returns null for empty string (optional field)', () => {
      expect(validateEmail('')).toBeNull()
      expect(validateEmail(undefined)).toBeNull()
    })

    it('rejects malformed email', () => {
      expect(validateEmail('notanemail')).not.toBeNull()
      expect(validateEmail('missing@')).not.toBeNull()
    })

    it('accepts a valid email', () => {
      expect(validateEmail('user@example.com')).toBeNull()
    })
  })
})
