/**
 * Human-readable labels for payment methods returned by the backend.
 * Extracted from HistorialPagosCard so it can be shared across payment-related components.
 */
export const METODO_PAGO_LABEL = {
  mercado_pago: 'MercadoPago',
  manual: 'Cobro manual',
}

/**
 * Unified map of payment estado → { label, variant, icon } for Badge rendering.
 * Covers all 5 backend states. Unknown estado falls back to neutral (not success).
 *
 * variant values match Badge component: success | danger | warning | info | neutral
 */
export const PAGO_ESTADO_MAP = {
  aprobado:    { label: 'Aprobado',    variant: 'success' },
  pendiente:   { label: 'Pendiente',   variant: 'warning' },
  rechazado:   { label: 'Rechazado',   variant: 'danger'  },
  cancelado:   { label: 'Cancelado',   variant: 'danger'  },
  reembolsado: { label: 'Reembolsado', variant: 'info'    },
}

/**
 * Returns the Badge variant for a given pago estado.
 * Unknown states default to 'neutral' (never 'success').
 */
export function pagoEstadoVariant(estado) {
  return PAGO_ESTADO_MAP[estado]?.variant ?? 'neutral'
}

/**
 * Returns the human-readable label for a given pago estado.
 */
export function pagoEstadoLabel(estado) {
  return PAGO_ESTADO_MAP[estado]?.label ?? estado ?? '—'
}
