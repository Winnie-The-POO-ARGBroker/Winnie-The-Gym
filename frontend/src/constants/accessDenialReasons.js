/**
 * Complete enum of access denial reasons returned by the backend.
 * Maps denial_reason codes to human-readable Spanish messages.
 */
export const ACCESS_DENIAL_REASONS = {
  // Identity / membership
  UNKNOWN_USER: 'Usuario desconocido o DNI incorrecto',
  USER_SUSPENDED: 'Usuario suspendido',
  MEMBERSHIP_INACTIVE: 'Membresía inactiva o vencida',
  SIN_PLAN: 'El socio no tiene un plan activo',

  // QR token
  REPLAY_ATTACK: 'Código QR ya fue utilizado',
  TOKEN_EXPIRED: 'Código QR expirado',
  TOKEN_INVALID: 'Código QR inválido',

  // Anti-passback (#149)
  YA_FIGURA_ADENTRO: 'El socio ya figura como adentro',
  NO_FIGURA_ADENTRO: 'El socio no figura como adentro',
  YA_REGISTRADO: 'Acceso ya registrado recientemente',

  // Capacity / schedule (#220)
  AFORO_COMPLETO: 'El gimnasio ha alcanzado su aforo máximo',
  FUERA_DE_HORARIO: 'Fuera del horario de atención',

  // Infrastructure
  NETWORK_ERROR: 'No hay conexión con el servidor',
  ERROR_SERVIDOR: 'Error interno del servidor',
};

/**
 * Denial reasons that support staff override (allow_override=true from backend).
 */
export const OVERRIDABLE_REASONS = new Set([
  'YA_FIGURA_ADENTRO',
  'NO_FIGURA_ADENTRO',
  'YA_REGISTRADO',
]);

/**
 * Resolves a denial reason code to its display label.
 * Falls back to the raw code if unknown.
 */
export function getDenialLabel(reason, fallback = '') {
  if (!reason) return fallback;
  return ACCESS_DENIAL_REASONS[reason] ?? reason;
}
