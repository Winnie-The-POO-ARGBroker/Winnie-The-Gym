/**
 * Format a Date object or ISO string as YYYY-MM-DD.
 *
 * @param {Date|string} date
 * @returns {string} ISO date string, e.g. '2026-09-20'
 */
export function formatISO(date) {
  return new Date(date).toISOString().slice(0, 10)
}

/**
 * Format an ISO date string as a localized date.
 *
 * @param {string|null|undefined} isoString
 * @param {string} [locale='es-AR']
 * @returns {string} Localized date string, e.g. '20/09/2026', or '—' if null.
 */
export function formatFecha(isoString, locale = 'es-AR') {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getTimeAgo(dateString, now = new Date()) {
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now - date) / 60000);
  
  if (diffInMinutes < 1) return 'hace un momento';
  if (diffInMinutes === 1) return 'hace 1 minuto';
  if (diffInMinutes < 60) return `hace ${diffInMinutes} minutos`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return 'hace 1 hora';
  if (diffInHours < 24) return `hace ${diffInHours} horas`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'hace 1 día';
  return `hace ${diffInDays} días`;
}
