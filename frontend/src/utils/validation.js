/**
 * Shared client-side validation utilities.
 *
 * All validators follow the same contract:
 *   (value: string) => string | null
 *   - Returns an error message string if invalid.
 *   - Returns null if the value is valid.
 *
 * These are the single source of truth for DNI, phone, and email validation.
 * Import from here — do NOT duplicate logic in individual pages/components.
 */

/**
 * Validates an Argentine DNI (7-8 numeric digits).
 *
 * @param {string} value
 * @returns {string|null} Error message or null if valid.
 */
export function validateDni(value) {
  if (!value || !value.trim()) return 'El DNI es obligatorio.'
  if (!/^\d{7,8}$/.test(value.trim())) {
    return 'El DNI debe tener 7 u 8 dígitos.'
  }
  return null
}

/**
 * Validates a phone number.
 * Accepts digits with optional +, (, ), -, and spaces. Min 7, max 30 chars.
 *
 * @param {string} value
 * @returns {string|null} Error message or null if valid.
 */
export function validateTelefono(value) {
  if (!value || !value.trim()) return 'El teléfono es obligatorio.'
  if (!/^[+]?[\d\s()\-]{7,30}$/.test(value.trim())) {
    return 'Teléfono inválido. Formato esperado: +54 9 351 1234567.'
  }
  return null
}

/**
 * Validates an email address.
 * Returns null for empty/undefined (email is optional in most contexts).
 * Only validates format when a value is provided.
 *
 * @param {string} value
 * @returns {string|null} Error message or null if valid (or empty).
 */
export function validateEmail(value) {
  if (!value || !value.trim()) return null // optional field
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return 'Email inválido.'
  }
  return null
}
