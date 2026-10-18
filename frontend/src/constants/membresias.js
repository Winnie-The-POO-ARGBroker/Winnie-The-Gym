/**
 * Unified map of membresia estado → { label, variant } for Badge rendering.
 * Covers all known backend states. Unknown estado falls back to neutral.
 *
 * variant values match Badge component: success | danger | warning | info | neutral
 */
export const MEMBRESIA_ESTADO_MAP = {
  activa:          { label: 'Activa',          variant: 'success' },
  vencida:         { label: 'Vencida',         variant: 'danger'  },
  pendiente:       { label: 'Pendiente',       variant: 'warning' },
  pendiente_pago:  { label: 'Pendiente pago',  variant: 'warning' },
  suspendida:      { label: 'Suspendida',      variant: 'neutral' },
  cancelada:       { label: 'Cancelada',       variant: 'danger'  },
  renovada:        { label: 'Renovada',        variant: 'neutral' },
}

/**
 * Returns the Badge variant for a given membresia estado.
 * Unknown states default to 'neutral' (never 'success').
 */
export function membresiaEstadoVariant(estado) {
  return MEMBRESIA_ESTADO_MAP[estado]?.variant ?? 'neutral'
}

/**
 * Returns the human-readable label for a given membresia estado.
 */
export function membresiaEstadoLabel(estado) {
  return MEMBRESIA_ESTADO_MAP[estado]?.label ?? estado ?? '—'
}
