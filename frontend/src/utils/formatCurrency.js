/**
 * Shared currency formatting utility for ARS amounts.
 * Replaces inline `Intl.NumberFormat('es-AR', { style: 'currency', ... })` calls
 * scattered across the frontend. Import formatARS() everywhere a peso amount
 * needs to be displayed as a formatted string.
 */

const _fmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

/**
 * Format a numeric value as ARS currency.
 *
 * @param {number|string|null|undefined} value - The amount to format.
 * @returns {string} Formatted currency string (e.g. '$ 12.000'), or '--' for invalid/null values.
 */
export function formatARS(value) {
  if (value == null || value === '' || isNaN(Number(value))) return '--'
  return _fmt.format(Number(value))
}
