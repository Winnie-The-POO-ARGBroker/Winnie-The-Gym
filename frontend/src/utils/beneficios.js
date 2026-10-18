/**
 * Plan benefits come in two shapes: the API stores plain strings
 * (`['Acceso a clases']`) while the plan form edits `{ texto, incluido }` objects.
 * This turns either into `{ texto, incluido }` and drops blank entries.
 */
export function normalizarBeneficios(raw) {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (typeof item === 'string') return { texto: item.trim(), incluido: true }
      if (item && typeof item === 'object') {
        return { texto: String(item.texto ?? '').trim(), incluido: item.incluido !== false }
      }
      return null
    })
    .filter((item) => item && item.texto)
}
